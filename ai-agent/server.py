from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

# Add the current directory to the path so we can import the interview agent
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the InterviewAgentAdapter class
from interview_agent_adapter import InterviewAgentAdapter

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global variable to store the interview agent instance
interview_agent = None

@app.route('/start', methods=['GET'])
def start_interview():
    """Start a new interview and return the first question."""
    global interview_agent
    
    try:
        # Initialize a new interview agent
        interview_agent = InterviewAgentAdapter()
        
        # Get the first question
        first_question = interview_agent.start_interview()
        
        return jsonify({
            'status': 'success',
            'question': first_question,
            'is_complete': False
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/respond', methods=['POST'])
def respond():
    """Accept user response and return the next question."""
    global interview_agent
    
    if not interview_agent:
        return jsonify({
            'status': 'error',
            'message': 'No active interview. Please start a new interview.'
        }), 400
        
    try:
        data = request.json
        user_response = data.get('response', '')
        
        # Process the response and get the next question
        next_question, is_complete = interview_agent.process_response(user_response)
        
        return jsonify({
            'status': 'success',
            'question': next_question,
            'is_complete': is_complete
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/end', methods=['POST'])
def end_interview():
    """End the current interview."""
    global interview_agent
    
    if not interview_agent:
        return jsonify({
            'status': 'error',
            'message': 'No active interview to end.'
        }), 400
        
    try:
        # Get any final results or summary
        summary = interview_agent.end_interview()
        
        # Reset the interview agent
        interview_agent = None
        
        return jsonify({
            'status': 'success',
            'summary': summary
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Run the Flask app
    app.run(host='0.0.0.0', port=5001, debug=True)

