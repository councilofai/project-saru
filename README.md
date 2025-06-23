# Understanding and Implementing the Project Saru Facilitator AI and Council Architecture

## Overview

This guide explains how to understand, implement, and run the existing Project Saru code. The system implements a sophisticated Facilitator AI and Council architecture for medical question analysis. Here's how to get it running and understand what's happening under the hood.

## Getting Started with the Existing Code

### 1. Initial Setup and Startup

**Step 1: Install Dependencies**
```bash
npm install express axios socket.io openai @pinecone-database/pinecone
```

**Step 2: Configure API Keys**
Open `server.js` and replace the placeholder:
```javascript
const OPENAIAPIKEY = 'your-actual-openai-api-key-here';
```

**Step 3: Start the Server**
```bash
node server.js
```

You'll see:
```
Server is running on port 8081
Client connected (when someone opens the web interface)
```

### 2. What Happens When You Start the System

When `server.js` starts, it initializes several key components:

**Server Infrastructure:**
- Express server on port 8081
- Socket.IO for real-time communication
- OpenAI API configuration

**Council State Variables (Initially Empty):**
```javascript
// These are all set to empty/0 when server starts:
let discussionState = {
  round: 0,
  originalPrompt: "",
  prompt: "",
  responses: [],
  disagreements: [],
  consensusReached: false
};

let AICouncilTraits = {}; // Empty until first discussion
let initialize_AI_Council = 0; // Flag to track if council is initialized
```

## Understanding the Facilitator AI Architecture

### How the Facilitator Actually Works

The Facilitator AI is **not a separate AI agent** - it's the server-side coordination logic that manages the entire discussion process. Here's what it actually does:

#### 1. Discussion Initiation (When someone submits a question)

**What happens in `/initiateDiscussion` endpoint:**
```javascript
app.post('/initiateDiscussion', async (req, res) => {
  // 1. Capture the medical question
  discussionState.prompt = req.body.prompt;
  discussionState.originalPrompt = req.body.prompt;
  
  // 2. Reset discussion state for new conversation
  discussionState.round = 0;
  discussionState.responses = [];
  discussionState.disagreements = [];
  discussionState.consensusReached = false;

  // 3. First-time setup: Initialize the AI Council
  if(initialize_AI_Council == 0) {
    console.log("initialize_AI_Council - PRE: " + initialize_AI_Council);
    initialize_AI_Council = 1;
    await initializeCouncilSystemPrompt(discussionState.prompt);
  }

  // 4. Start the actual discussion process
  proceedWithRound(discussionState.prompt);
});
```

**What you'll see in the console:**
```
=====================================================
in initiateDiscussion
initiateDiscussion: Your medical question here
discussionState.prompt: Your medical question here
initialize_AI_Council - PRE: 0
initialize_AI_Council - POST: 1
=====================================================
```

#### 2. The Core Facilitator Logic (`proceedWithRound` function)

This is the brain of the Facilitator AI. Here's exactly what happens:

**Round Announcement:**
```javascript
let facilitatorMsg = "<strong>[Round " + round + "]:</strong> " + thisPrompt;
io.emit('messages', {agentId: "Facilitator", text: facilitatorMsg, typeOfMsg: "Facilitator making prompt"});
```

**Parallel Agent Querying:**
```javascript
const responses = await Promise.all(
  Object.entries(AICouncil).map(async ([agentId, elicitOpinion]) => {
    console.log("---WAITING BETWEEN REQUEST---");
    await sleep(3000);  // Rate limiting
    console.log("---CONTINUING WITH REQUEST---");
    const response = await elicitOpinion(thisPrompt);
    io.emit('messages', {agentId: agentId, text: response, typeOfMsg: "Response from AI Council Member"});
    return {agentId: agentId, text: response};
  })
);
```

**What you'll see in console during this phase:**
```
=====================================================
proceedWithRound with thisPrompt: Your question
=====================================================
---WAITING BETWEEN REQUEST---
---CONTINUING WITH REQUEST---
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
elicitOpinionAI_A Response: [Detailed medical response]
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
---RETURNED THIS REQUEST---
[Repeats for AI_B through AI_F]
```

**Consensus Analysis:**
```javascript
const consensusOrDisagreement = await analyzeResponses(responses);

if (consensusOrDisagreement.consensus) {
  // Generate final consensus statement
  const consensusStatement = await synthesizeResponsesForConsensus(discussionState.responses)
  io.emit('messages',{agentId:'Facilitator', text: consensusStatement, round, typeOfMsg:"ConsensusReached"})
  return;
}
```

**If No Consensus - Continue Discussion:**
```javascript
if (discussionState.round < 21) {
  discussionState.round++;
  discussionState.disagreements.push(consensusOrDisagreement.disagreements);
  discussionState.prompt = await formulateNewPrompt(discussionState.disagreements);
  proceedWithRound(discussionState.prompt); // Recursive call
}
```

## Understanding the Council Architecture

### How the AI Council Actually Gets Created

#### 1. Council Initialization (`initializeCouncilSystemPrompt`)

When the first question is asked, this function creates 6 identical AI agents:

```javascript
async function initializeCouncilSystemPrompt(thisPrompt) {
  AICouncilTraits = {
    AI_A: {
      thisModel: "gpt-4o", 
      thisTemp: 1, 
      thisTopP: 1, 
      thisSysMsg: "Your 'name' is 'AI_A'. You are part of a council that includes 'AI_B', 'AI_C', 'AI_D', 'AI_E', and 'AI_F'..."
    },
    // AI_B through AI_F have identical structure
  };
}
```

**Key Points:**
- All 6 agents use the same model (GPT-4o)
- All have identical medical expertise (21 medical domains)
- All follow the same 5-step response pattern
- They only differ by name and awareness of other council members

#### 2. How Each Agent Actually Responds

Each agent has its own function that calls OpenAI:

```javascript
async function elicitOpinionAI_A(prompt) {
  const response = await openai.createChatCompletion({
    model: AICouncilTraits.AI_A.thisModel,
    messages: [
      {role: "system", content: AICouncilTraits.AI_A.thisSysMsg},
      {role: "user", content: prompt}
    ],
    temperature: AICouncilTraits.AI_A.thisTemp,
    max_tokens: 2000,
    top_p: AICouncilTraits.AI_A.thisTopP,
    frequency_penalty: 0,
    presence_penalty: 0
  }); 
  
  console.log("elicitOpinionAI_A Response: " + response.data.choices[0].message.content);
  return response.data.choices[0].message.content;
}
```

**What happens in practice:**
1. Each agent receives the exact same prompt
2. Due to temperature=1, they may give different responses
3. Each response follows the 5-step medical reasoning pattern
4. All responses are collected and compared

#### 3. The Agent Registry System

The council is organized for easy iteration:

```javascript
const AICouncil = {
  'AI_A': elicitOpinionAI_A,
  'AI_B': elicitOpinionAI_B,
  'AI_C': elicitOpinionAI_C,
  'AI_D': elicitOpinionAI_D,
  'AI_E': elicitOpinionAI_E,
  'AI_F': elicitOpinionAI_F
};
```

The facilitator iterates through this object to query all agents in parallel.

## Understanding the Consensus Mechanism

### How Consensus Detection Actually Works

#### 1. Pairwise Comparison Process

The system compares every agent's response with every other agent's response:

```javascript
async function analyzeResponses(responses) {
  let disagreements = [];

  // Compare each pair of responses
  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      const comparisonPrompt = `Compare these two statements:
1. "${responses[i].text}" from ${responses[i].agentId}
2. "${responses[j].text}" from ${responses[j].agentId}
Do these two statements agree with each other, or do they disagree?`;
      
      const comparisonResponse = await callOpenAI_compareQs(comparisonPrompt);
      
      if (comparisonResponse.toLowerCase().includes('disagree')) {
        disagreements.push({
          disagreement: [responses[i], responses[j]],
          reason: comparisonResponse,
        });
      }
    }
  }
```

**What you'll see in console:**
```
|||||||||||||||||||||||||||||||||||START||||||||||||||||||||||||||||||||||||
in analyzeResponses with responses: [Array of 6 responses]
Sending statements to compare to LLM: [Comparison prompt]
|||||||||||||||||||||||||||||||||||BACK IN analyzeResponses||||||||||||||||||||||||||||||||||||
Back in analyzeResponses() with callOpenAI_compareQs response: disagree
There is a disagreement: AI_A vs AI_B
[Response A] vs [Response B]
```

#### 2. The Agree/Disagree Bot

A specialized AI agent that only responds with "agree" or "disagree":

```javascript
async function callOpenAI_compareQs(AIReponsesToCompare) {
  const response = await openai.createChatCompletion({
    model: "gpt-4o",
    messages: [
      {role: "system", content: "You are a very smart bot that only responds with the word 'agree' or 'disagree'..."},
      {role: "user", content: "Do the following text agree with each other or not? [" + AIReponsesToCompare + "]"}
    ],
    temperature: 0, // No randomness for consistency
    max_tokens: 2000
  });
  
  return response.data.choices[0].message.content;
}
```

#### 3. What Happens When There's Disagreement

**Follow-up Prompt Generation:**
```javascript
async function formulateNewPrompt(theseDisagreements) {
  // Summarize all opinions
  let opinionString = "";
  for(i = 0; i < discussionState.responses.length; i++) {
    opinionString += `[${discussionState.responses[i].agentId}'s opinion: ${discussionState.responses[i].text}]`;
  }
  
  const prompt = `Summarize the following opinions from council members: ${opinionString}. Provide the summary and formulate a question that can be asked to council members that would help clarify the disagreements between their opinions.`;

  const newQuestion = await callOpenAI_formulateFollowupPrompt(prompt);
  
  // Append reference to original question
  const completedNewQuestion = newQuestion + ". Based on your preceding response, how would you answer the original question: [" + discussionState.originalPrompt + "]";
  
  return completedNewQuestion;
}
```

## Running a Complete Discussion Session

### Step-by-Step Process

#### 1. Start the Server
```bash
node server.js
```

#### 2. Submit a Medical Question

Send a POST request to `/initiateDiscussion`:
```json
{
  "prompt": "A 65-year-old patient presents with crushing chest pain radiating to the left arm. What is the most likely diagnosis?"
}
```

#### 3. What Actually Happens (In Real-Time)

**Round 1:**
```
[Facilitator]: Round 1: A 65-year-old patient presents with crushing chest pain...
[AI_A]: RESTATING THE QUESTION: The question asks about a 65-year-old patient presenting with crushing chest pain...
[AI_B]: RESTATING THE QUESTION: This case presents a classic presentation of acute coronary syndrome...
[AI_C]: RESTATING THE QUESTION: The patient's symptoms suggest a cardiovascular emergency...
[Continue for AI_D, AI_E, AI_F]
```

**Consensus Analysis:**
```
Analyzing responses for agreement/disagreement
Comparing AI_A vs AI_B: agree
Comparing AI_A vs AI_C: agree
Comparing AI_A vs AI_D: disagree
[Continue all pairwise comparisons]
```

**If Disagreement Found:**
```
There is a disagreement: AI_A vs AI_D
[Shows the specific disagreeing responses]
Formulating new prompt based on disagreements
New prompt: "Given that some council members suggested myocardial infarction while others suggested angina, please clarify..."
```

**Round 2+ (If Needed):**
- Same process with refined question
- Continues until consensus or max rounds (21)

**Final Consensus:**
```
[Facilitator]: [Synthesized consensus statement combining all agreed-upon responses]
```

## Understanding the Web Interface Integration

### Real-Time Communication Flow

The system uses Socket.IO for live updates:

```javascript
// Server broadcasts messages in real-time
io.emit('messages', {
  agentId: "Facilitator", 
  text: facilitatorMsg, 
  typeOfMsg: "Facilitator making prompt"
});

io.emit('messages', {
  agentId: agentId, 
  text: response, 
  typeOfMsg: "Response from AI Council Member"
});
```

### Message Types You'll See

1. **"Facilitator making prompt"** - Round announcements
2. **"Response from AI Council Member"** - Individual agent responses  
3. **"ConsensusReached"** - Final synthesized answer

## Monitoring and Debugging

### Key Console Outputs to Watch

**Initialization:**
```
initialize_AI_Council - PRE: 0
initialize_AI_Council - POST: 1
```

**Round Progress:**
```
=====================================================
proceedWithRound with thisPrompt: [Question]
=====================================================
```

**Agent Responses:**
```
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
elicitOpinionAI_A Response: [Full response text]
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

**Consensus Analysis:**
```
|||||||||||||||||||||||||||||||||||START||||||||||||||||||||||||||||||||||||
There is a disagreement: AI_A vs AI_B
||||||||||||||||||||||||||||||||END|||||||||||||||||||||||||||||||||||||||
```

### Common Issues and Solutions

**"Maximum rounds reached":**
- The council couldn't reach consensus in 21 rounds
- Usually indicates very complex or ambiguous questions

**API Rate Limiting:**
- 3-second delays built in (`await sleep(3000)`)
- If you get rate limit errors, increase the delay

**Memory Issues:**
- Long discussions store all conversation history
- Clear `discussionState` between sessions if needed

## Customizing the Existing Implementation

### Adjusting Council Size

To modify the number of agents, add/remove from both:

1. **AICouncilTraits initialization**
2. **Agent function definitions** 
3. **AICouncil registry**

### Modifying Discussion Parameters

**Max Rounds:**
```javascript
if (discussionState.round < 21) { // Change 21 to desired max
```

**Rate Limiting:**
```javascript
await sleep(3000); // Change 3000 to adjust delay
```

**Response Length:**
```javascript
max_tokens: 2000, // Adjust token limit
```

### Agent Specialization

Modify the system message for different expertise:

```javascript
thisSysMsg: "Your 'name' is 'AI_A'. You are a cardiologist specializing in..."
```

## The Experimental Librarian AI

The code includes extensive experimental functionality for a knowledge-base connected agent (lines marked with `/***EXPERIMENTAL***/`). This is disabled by default but can be enabled by:

1. Setting up Pinecone vector database
2. Configuring the Pinecone API key
3. Uncommenting the librarian agent in the council registry
