import importlib.util
import sys
import os

# Import the InterviewAgent from interview-agent.py (handling the hyphen in filename)
spec = importlib.util.spec_from_file_location(
    "interview_agent", 
    os.path.join(os.path.dirname(__file__), "interview-agent.py")
)
interview_agent_module = importlib.util.module_from_spec(spec)
sys.modules["interview_agent"] = interview_agent_module
spec.loader.exec_module(interview_agent_module)
InterviewAgent = interview_agent_module.InterviewAgent

class InterviewAgentAdapter:
    """
    Adapter class that wraps the InterviewAgent to provide a clean interface
    for the Flask API with the necessary methods.
    """
    
    def __init__(self):
        self.agent = None
        self.conversation_history = []
        
    def start_interview(self):
        """
        Initialize the interview and return the first question.
        
        Returns:
            str: The first interview question
        """
        # Create a new InterviewAgent instance
        self.agent = InterviewAgent()
        
        # Get the first question from the agent
        first_question = self.agent.get_first_question()
        
        # Record this in conversation history
        self.conversation_history.append({"role": "assistant", "content": first_question})
        
        return first_question
        
    def process_response(self, response):
        """
        Process the user's response and return the next question.
        
        Args:
            response (str): The user's response to the previous question
            
        Returns:
            str: The next question from the agent
        """
        if not self.agent:
            # If there's no active interview, start one
            return self.start_interview()
            
        # Record the user's response
        self.conversation_history.append({"role": "user", "content": response})
        
        # Get the next question from the agent
        next_question = self.agent.get_next_question(response)
        
        # Record the agent's question
        self.conversation_history.append({"role": "assistant", "content": next_question})
        
        return next_question
        
    def end_interview(self):
        """
        End the interview and return a summary.
        
        Returns:
            str: A summary of the interview
        """
        if not self.agent:
            return "No active interview to end."
            
        # Generate a summary of the interview
        summary = self.agent.generate_summary(self.conversation_history)
        
        # Reset the agent state
        self.agent = None
        self.conversation_history = []
        
        return summary

