import json
import os
import asyncio
from typing import Dict, Any, List
from datetime import datetime
from dotenv import load_dotenv
from web3 import Web3
from langchain_anthropic import ChatAnthropic
from eth_account import Account
import logging
from browser_agent import BrowserToolkit, BrowserTool
from coinbase_agentkit import (
    AgentKit,
    AgentKitConfig,
    CdpWalletProvider,
    CdpWalletProviderConfig,
    cdp_api_action_provider,
    cdp_wallet_action_provider,
    erc20_action_provider,
    pyth_action_provider,
    wallet_action_provider,
    weth_action_provider,
    twitter_action_provider,
)
from browser_use import Browser, BrowserConfig

# Load environment variables
load_dotenv(override=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InterviewAgent:
    def __init__(self, character_config: Dict[str, Any]):
        self.config = character_config
        self.conversation_history = []
        self.website_knowledge = {}
        self.llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")
        self.current_question_index = 0
        self.follow_up_count = 0
        self.max_follow_ups = 2
        
        # Initialize browser toolkit
        self.browser_toolkit = BrowserToolkit.from_llm(self.llm)
        self.browser_tool = self.browser_toolkit.get_tools()[0]

        # Add browser configuration
        self.browser_tool.browser = Browser(
            config=BrowserConfig(
                chrome_instance_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                headless=True
                #debugging_port=9222  # Specify debugging port
            )
        )
        
        # Initialize wallet and AgentKit
        self.wallet_provider = CdpWalletProvider(CdpWalletProviderConfig())
        self.agent_kit = AgentKit(AgentKitConfig(
            wallet_provider=self.wallet_provider,
            action_providers=[
                cdp_api_action_provider(),
                cdp_wallet_action_provider(),
                erc20_action_provider(),
                pyth_action_provider(),
                wallet_action_provider(),
                weth_action_provider(),
                twitter_action_provider(),
            ]
        ))
        
        # Initialize Web3
        #self.w3 = Web3(Web3.HTTPProvider(os.getenv("ETH_RPC_URL")))
        #self.contract = self.setup_nft_contract()

    async def learn_websites(self):
        """Learn from websites using browser agent."""
        logger.info("Learning from websites...")
        
        for url in self.config["website_knowledge"]["urls"]:
            try:
                # Create browsing task for website exploration
                task = f"""
                Visit {url} and thoroughly explore the website to understand:
                1. Main product/service offerings
                2. Key features and benefits
                3. Technical specifications
                4. Pricing information (if available)
                5. Documentation and guides
                
                Provide a comprehensive summary of the findings.
                """
                
                # Execute browser task
                result = await self.browser_tool._arun(task)
                self.website_knowledge[url] = result
                logger.info(f"Successfully explored {url}")
                
            except Exception as e:
                logger.error(f"Error exploring {url}: {e}")
                # Use fallback content if available
                self.website_knowledge[url] = self.config["website_knowledge"].get(
                    "fallback_content", {}).get("description", "")
        
        logger.info("Website learning completed")

    async def yn_vagueness(self, response: str, question_context: str) -> Dict[str, str]:
        """Analyze if response is vague."""
        prompt = f"""
        Question asked: {question_context}
        User response: {response}

        Is this response vague? 
        Return your answer as a yes or no answer
        """
        llm_response = await self.llm.ainvoke(prompt)
        return llm_response.text()
    

    async def yn_difference(self, response: str, question_context: str) -> Dict[str, str]:
        """Analyze if response differs from product knowledge."""
        prompt = f"""
        Question asked: {question_context}
        User response: {response}

        Does this response differ from what you know about {self.config['name']}?
        Return your answer as a yes or no answer
        """
        llm_response = await self.llm.ainvoke(prompt)
        return llm_response.text()

    async def yn_features(self, response: str) -> Dict[str, str]:
        """Analyze features mentioned in response."""
        prompt = f"""
        User response: {response}

        Are there any features that are commonly used alongside any features mentioned in this response?
        Return your answer as a yes or no answer
        """
        llm_response = await self.llm.ainvoke(prompt)
        return llm_response.text()

    async def yn_continue(self, response: str, question_context: str) -> Dict[str, str]:
        """Determine if conversation should continue."""
        prompt = f"""
        Question asked: {question_context}
        User response: {response}

        Would continuing this line of conversation yield more insights about product-market fit?
        Return your answer as a yes or no answer
        """
        llm_response = await self.llm.ainvoke(prompt)
        return llm_response.text()

    async def followup_vagueness(self, response: str, question_context: str) -> str:
        """Generate a follow-up question based on LLM analysis."""
        prompt = f"""
        Question asked: {question_context}
        User response: {response}

        Given this question and answer, what follow-up question should I ask to understand the user's perspective better?
        The follow-up should help clarify their response and gather more specific details.
        
        Return only the follow-up question, without any additional explanation or formatting.
        """
        
        follow_up = await self.llm.ainvoke(prompt)
        return follow_up.text().strip()

    async def followup_differences(self, response: str, question_context: str) -> str:
        """Generate a follow-up question for unexpected responses."""
        prompt = f"""
        Question asked: {question_context}
        User response: {response}

        Given this response differs from typical product usage patterns, what follow-up question should I ask to better understand their unique perspective?
        The follow-up should explore their reasoning and specific use case.
        
        Return only the follow-up question, without any additional explanation or formatting.
        """
        
        follow_up = await self.llm.ainvoke(prompt)
        return follow_up.text().strip()

    async def feature_connections(self, feature: str) -> str:
        """Ask LLM about related features."""
        prompt = f"""
        Based on your knowledge of {self.config['name']}, what features do users typically use alongside {feature}?
        Explain why these combinations are valuable.
        """
        return await self.llm.ainvoke(prompt).text()

    async def conduct_interview(self):
        """Conduct the full interview process."""
        logger.info("Starting interview...")
        
        product_name = "hyperbolic"
        questions = [q.format(product=product_name) for q in self.config["preset_questions"]["initial"]]
        
        for question in questions:
            response = await self.ask_question(question)
            
            # Analyze vagueness
            vagueness = await self.yn_vagueness(response, question)
            print(f"Vagueness: {vagueness}")
            if "Yes" in vagueness:
                follow_up_count = 0
                while follow_up_count < 2:
                    print("in vagueness follow up loop")
                    follow_up = await self.followup_vagueness(response, question)
                    print("follow_up")
                    follow_up_response = await self.ask_question(follow_up)
                    
                    should_continue_resp = await self.should_continue(
                        f"Question: {follow_up}\nResponse: {follow_up_response}"
                    )
                    if "no" in should_continue_resp:
                        break
                    follow_up_count += 1
            
            # Analyze differences
            differences = await self.yn_difference(response, question)
            if "Yes" in differences:
                for _ in range(3):
                    follow_up = await self.followup_differences(response, question)
                    response = await self.ask_question(follow_up)
                    should_continue_resp = await self.should_continue(
                        f"Exploring unexpected response: {response}"
                    )
                    if "no" in should_continue_resp:
                        break
            
            # Analyze features
            features = await self.yn_features(response)
            if "Yes" in features and "none mentioned" not in features["yes/no"]:
                related_features = await self.feature_connections(features["yes/no"])
                print(f"\nInteresting point! {related_features}")
                interest_response = await self.ask_question(
                    "Are you interested in these related features?"
                )
                should_continue_resp = await self.should_continue(
                    f"Feature exploration: {interest_response}"
                )
                if "no" in should_continue_resp:
                    continue
        
        await self.save_conversation()
        logger.info("Interview completed successfully")
        
        # Get wallet address
        #wallet_address = await self.collect_wallet_address()
        
        # Save conversation and mint NFT
        #await self.mint_nft(wallet_address)
      

    async def ask_question(self, question: str) -> str:
        """Ask a question following style rules."""
        # Apply style rules
        for rule in self.config["style"]["all"]:
            logger.debug(f"Applying style rule: {rule}")
        
        print(f"\n{question}")
        response = input("Your response: ")
        self.conversation_history.append({
            "question": question,
            "response": response,
            "timestamp": datetime.now().isoformat()
        })
        return response

    async def collect_wallet_address(self) -> str:
        """Collect and validate Ethereum wallet address."""
        print("\nIMPORTANT: Please provide your Ethereum wallet address.")
        print("This address will receive an NFT signifying completion of the interview.")
        print("Please double-check your address as this cannot be changed later.")
        
        while True:
            address = input("\nEthereum wallet address: ")
            if self.w3.is_address(address):
                return address
            print("Invalid Ethereum address. Please try again.")

    def setup_nft_contract(self):
        """Setup NFT contract connection."""
        contract_address = os.getenv("NFT_CONTRACT_ADDRESS")
        abi = json.loads(os.getenv("NFT_CONTRACT_ABI"))
        return self.w3.eth.contract(address=contract_address, abi=abi)

    async def mint_nft(self, recipient_address: str):
        """Mint NFT to recipient using AgentKit."""
        try:
            logger.info(f"Minting NFT to {recipient_address}")
            
            # Use AgentKit for minting
            mint_result = await self.agent_kit.mint_nft(
                contract_address=os.getenv("NFT_CONTRACT_ADDRESS"),
                recipient_address=recipient_address,
                token_uri="ipfs://your-token-uri"  # Replace with actual token URI
            )
            
            logger.info(f"NFT minted successfully. Transaction hash: {mint_result['transaction_hash']}")
            
        except Exception as e:
            logger.error(f"Error minting NFT: {e}")
            raise

    async def save_conversation(self):
        """Save conversation to persistent file."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"interviews/interview_{timestamp}.json"
        
        # Create directory if it doesn't exist
        os.makedirs("interviews", exist_ok=True)
        
        # Generate summary
        summary = self.generate_summary()
        
        # Save conversation and summary
        data = {
            "timestamp": timestamp,
            "conversation": self.conversation_history,
            "summary": summary,
            "website_knowledge": self.website_knowledge
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Conversation saved to {filename}")

    def generate_summary(self) -> Dict[str, Any]:
      """Generate interview summary using LLM analysis."""
      
      # Format conversation history for LLM
      formatted_history = []
      for item in self.conversation_history:
          formatted_history.append(f"Question: {item['question']}\nResponse: {item['response']}")
      
      conversation_text = "\n\n".join(formatted_history)
      
      # Create prompt for LLM
      prompt = f"""
      Below is a product interview conversation. The preset questions were:
      1. How disappointed would you feel if you could no longer use the product?
      2. What type of people would most benefit from using the product?
      3. What is the main benefit you receive from the product?
      4. How can we improve the product for you?

      Conversation:
      {conversation_text}

      Please generate a concise summary of the answers to the preset questions from this conversation.
      Format your response as JSON with the following structure:
      {{
          "disappointment_level": "answer to question 1",
          "target_users": "answer to question 2",
          "main_benefit": "answer to question 3",
          "desired_improvements": "answer to question 4",
          "key_insights": ["list of important insights"],
          "pmf_indicators": {{
              "signal_strength": "strong/moderate/weak",
              "reasoning": "explanation"
          }}
      }}
      """
      
      try:
          # Get LLM analysis
          response = asyncio.run(self.llm.ainvoke(prompt))
          summary = json.loads(response)
          
          # Add metadata
          summary["interview_metadata"] = {
              "total_questions": len(self.conversation_history),
              "completion_time": datetime.now().isoformat(),
              "website_knowledge": list(self.website_knowledge.keys())
          }
          
          return summary
          
      except Exception as e:
          logger.error(f"Error generating summary: {e}")
          return {
              "error": "Failed to generate summary",
              "timestamp": datetime.now().isoformat()
          }

    


async def main():
    # Load character configuration
    print("Fetching character configuration...")
    with open("characters/interviewer.json", "r") as f:
        character_config = json.load(f)
    print("Character configurations fetched successfully!")
    

    # Initialize agent
    print("Initializing agent...")
    agent = InterviewAgent(character_config)
    print("Agent initialized successfully!")
    
    # Learn from websites
    #print("Learning from websites...")
    #await agent.learn_websites()
    #print("Websites learned successfully!")
    # Conduct interview
    await agent.conduct_interview()

if __name__ == "__main__":
    asyncio.run(main())