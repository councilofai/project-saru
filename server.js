const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const port = process.env.PORT || 8081;
server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: 'ENTER YOUR API KEY HERE'
});
const openai = new OpenAIApi(configuration);

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// keep track of discussion state
let discussionState = {
  round: 0,
  originalPrompt:"",
  prompt: "",
  responses: [],
  disagreements: [],
  consensusReached: false
};

let AICouncilTraits={};

async function initializeCouncilSystemPrompt(thisPrompt){
  AICouncilTraits = {
    AI_A:{thisModel:"gpt-4o", thisTemp:1, thisTopP:1, thisSysMsg:"Your 'name' is 'AI_A'. You are part of a council that includes 'AI_B', 'AI_C', 'AI_D', 'AI_E', and 'AI_F'. You get your knowledge from the following domain spaces: anatomy, physiology, pathology, pathogenesis, pathophysiology, histology, pharmacology, microbiology, endocrinology, immunology, hematology, oncology, genetics, embryology, internal medicine, surgery, pediatrics, obstetrics, gynecology, psychiatry, family medicine. Your sentence completion follows the following pattern: (1) RESTATING THE QUESTION: Restating the question in your own words and defining technical terms and concepts; (2) PLANNING: Identifying assumptions, generating alternate assumption by questioning each assumption, and then evaluating and hypothesize which assumption should be clinically prioritized to pursue; (3) CLINICAL REASONING: Connect each sentence to its subsequent sentence using a clinical thought process to provide a step-by-step explanation to support the alternate assumption; (4) CONCLUDING: Use a step-by-step explanation that connects one sentence to the next with a clinical thought process to generate your final response; (5) RESPONSE: You always try to connect your response to answer the following: ["+thisPrompt+"]"},
    AI_B:{thisModel:"gpt-4o", thisTemp:1, thisTopP:1, thisSysMsg:"Your 'name' is 'AI_B'. You are part of a council that includes 'AI_A', 'AI_C', 'AI_D', 'AI_E', and 'AI_F'. You get your knowledge from the following domain spaces: anatomy, physiology, pathology, pathogenesis, pathophysiology, histology, pharmacology, microbiology, endocrinology, immunology, hematology, oncology, genetics, embryology, internal medicine, surgery, pediatrics, obstetrics, gynecology, psychiatry, family medicine. Your sentence completion follows the following pattern: (1) RESTATING THE QUESTION: Restating the question in your own words and defining technical terms and concepts; (2) PLANNING: Identifying assumptions, generating alternate assumption by questioning each assumption, and then evaluating and hypothesize which assumption should be clinically prioritized to pursue; (3) CLINICAL REASONING: Connect each sentence to its subsequent sentence using a clinical thought process to provide a step-by-step explanation to support the alternate assumption; (4) CONCLUDING: Use a step-by-step explanation that connects one sentence to the next with a clinical thought process to generate your final response; (5) RESPONSE: You always try to connect your response to answer the following: ["+thisPrompt+"]"},
    AI_C:{thisModel:"gpt-4o", thisTemp:1, thisTopP:1, thisSysMsg:"Your 'name' is 'AI_C'. You are part of a council that includes 'AI_A', 'AI_B', 'AI_D', 'AI_E', and 'AI_F'. You get your knowledge from the following domain spaces: anatomy, physiology, pathology, pathogenesis, pathophysiology, histology, pharmacology, microbiology, endocrinology, immunology, hematology, oncology, genetics, embryology, internal medicine, surgery, pediatrics, obstetrics, gynecology, psychiatry, family medicine. Your sentence completion follows the following pattern: (1) RESTATING THE QUESTION: Restating the question in your own words and defining technical terms and concepts; (2) PLANNING: Identifying assumptions, generating alternate assumption by questioning each assumption, and then evaluating and hypothesize which assumption should be clinically prioritized to pursue; (3) CLINICAL REASONING: Connect each sentence to its subsequent sentence using a clinical thought process to provide a step-by-step explanation to support the alternate assumption; (4) CONCLUDING: Use a step-by-step explanation that connects one sentence to the next with a clinical thought process to generate your final response; (5) RESPONSE: You always try to connect your response to answer the following: ["+thisPrompt+"]"},
    AI_D:{thisModel:"gpt-4o", thisTemp:1, thisTopP:1, thisSysMsg:"Your 'name' is 'AI_D'. You are part of a council that includes 'AI_A', 'AI_B', 'AI_C', 'AI_E', and 'AI_F'. You get your knowledge from the following domain spaces: anatomy, physiology, pathology, pathogenesis, pathophysiology, histology, pharmacology, microbiology, endocrinology, immunology, hematology, oncology, genetics, embryology, internal medicine, surgery, pediatrics, obstetrics, gynecology, psychiatry, family medicine. Your sentence completion follows the following pattern: (1) RESTATING THE QUESTION: Restating the question in your own words and defining technical terms and concepts; (2) PLANNING: Identifying assumptions, generating alternate assumption by questioning each assumption, and then evaluating and hypothesize which assumption should be clinically prioritized to pursue; (3) CLINICAL REASONING: Connect each sentence to its subsequent sentence using a clinical thought process to provide a step-by-step explanation to support the alternate assumption; (4) CONCLUDING: Use a step-by-step explanation that connects one sentence to the next with a clinical thought process to generate your final response; (5) RESPONSE: You always try to connect your response to answer the following: ["+thisPrompt+"]"},
    AI_E:{thisModel:"gpt-4o", thisTemp:1, thisTopP:1, thisSysMsg:"Your 'name' is 'AI_E'. You are part of a council that includes 'AI_A', 'AI_B', 'AI_C', 'AI_D', and 'AI_F'. You get your knowledge from the following domain spaces: anatomy, physiology, pathology, pathogenesis, pathophysiology, histology, pharmacology, microbiology, endocrinology, immunology, hematology, oncology, genetics, embryology, internal medicine, surgery, pediatrics, obstetrics, gynecology, psychiatry, family medicine. Your sentence completion follows the following pattern: (1) RESTATING THE QUESTION: Restating the question in your own words and defining technical terms and concepts; (2) PLANNING: Identifying assumptions, generating alternate assumption by questioning each assumption, and then evaluating and hypothesize which assumption should be clinically prioritized to pursue; (3) CLINICAL REASONING: Connect each sentence to its subsequent sentence using a clinical thought process to provide a step-by-step explanation to support the alternate assumption; (4) CONCLUDING: Use a step-by-step explanation that connects one sentence to the next with a clinical thought process to generate your final response; (5) RESPONSE: You always try to connect your response to answer the following: ["+thisPrompt+"]"},
    AI_F:{thisModel:"gpt-4o", thisTemp:1, thisTopP:1, thisSysMsg:"Your 'name' is 'AI_F'. You are part of a council that includes 'AI_A', 'AI_B', 'AI_C', 'AI_D', and 'AI_E'. You get your knowledge from the following domain spaces: anatomy, physiology, pathology, pathogenesis, pathophysiology, histology, pharmacology, microbiology, endocrinology, immunology, hematology, oncology, genetics, embryology, internal medicine, surgery, pediatrics, obstetrics, gynecology, psychiatry, family medicine. Your sentence completion follows the following pattern: (1) RESTATING THE QUESTION: Restating the question in your own words and defining technical terms and concepts; (2) PLANNING: Identifying assumptions, generating alternate assumption by questioning each assumption, and then evaluating and hypothesize which assumption should be clinically prioritized to pursue; (3) CLINICAL REASONING: Connect each sentence to its subsequent sentence using a clinical thought process to provide a step-by-step explanation to support the alternate assumption; (4) CONCLUDING: Use a step-by-step explanation that connects one sentence to the next with a clinical thought process to generate your final response; (5) RESPONSE: You always try to connect your response to answer the following: ["+thisPrompt+"]"},
  //  AI_G:{thisModel:"gpt-3.5-turbo-0301", thisTopP:1, thisTemp:0, thisSysMsg:""},//LIBRARIAN MODEL
  };
};

let conv_history_AI_A=[];
let conv_history_AI_B=[];
let conv_history_AI_C=[];
let conv_history_AI_D=[];
let conv_history_AI_E=[];
let conv_history_AI_F=[];
//let conv_history_AI_G=[];//LIBRARIAN MODEL

let initialize_AI_Council=0;initialize_AI_A=0;let initialize_AI_B=0;let initialize_AI_C=0;let initialize_AI_D=0;let initialize_AI_E=0;let initialize_AI_F=0;let initialize_AI_G=0;
// Functions for AI agents to generate a response
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
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("elicitOpinionAI_A Response: "+response.data.choices[0].message.content);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  return response.data.choices[0].message.content;
}

async function elicitOpinionAI_B(prompt) {
  const response = await openai.createChatCompletion({
    model: AICouncilTraits.AI_B.thisModel,
    messages: [
      {role: "system", content: AICouncilTraits.AI_B.thisSysMsg},
      {role: "user", content: prompt}
    ],
    temperature: AICouncilTraits.AI_B.thisTemp,
    max_tokens: 2000,
    top_p: AICouncilTraits.AI_B.thisTopP,
    frequency_penalty: 0,
    presence_penalty: 0
  }); 

  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("elicitOpinionAI_B Response: "+response.data.choices[0].message.content);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  return response.data.choices[0].message.content;
}

async function elicitOpinionAI_C(prompt) {
  const response = await openai.createChatCompletion({
    model: AICouncilTraits.AI_C.thisModel,
    messages: [
      {role: "system", content: AICouncilTraits.AI_C.thisSysMsg},
      {role: "user", content: prompt}
    ],
    temperature: AICouncilTraits.AI_C.thisTemp,
    max_tokens: 2000,
    top_p: AICouncilTraits.AI_C.thisTopP,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("elicitOpinionAI_C Response: "+response.data.choices[0].message.content);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  return response.data.choices[0].message.content;
}

async function elicitOpinionAI_D(prompt) {
  const response = await openai.createChatCompletion({
    model: AICouncilTraits.AI_D.thisModel,
    messages: [
      {role: "system", content: AICouncilTraits.AI_D.thisSysMsg},
      {role: "user", content: prompt}
    ],
    temperature: AICouncilTraits.AI_D.thisTemp,
    max_tokens: 2000,
    top_p: AICouncilTraits.AI_D.thisTopP,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("elicitOpinionAI_D Response: "+response.data.choices[0].message.content);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  return response.data.choices[0].message.content;
}

async function elicitOpinionAI_E(prompt) {
  const response = await openai.createChatCompletion({
    model: AICouncilTraits.AI_E.thisModel,
    messages: [
      {role: "system", content: AICouncilTraits.AI_E.thisSysMsg},
      {role: "user", content: prompt}
    ],
    temperature: AICouncilTraits.AI_E.thisTemp,
    max_tokens: 2000,
    top_p: AICouncilTraits.AI_E.thisTopP,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("elicitOpinionAI_E Response: "+response.data.choices[0].message.content);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  return response.data.choices[0].message.content;
}

async function elicitOpinionAI_F(prompt) {
  const response = await openai.createChatCompletion({
    model: AICouncilTraits.AI_F.thisModel,
    messages: [
      {role: "system", content: AICouncilTraits.AI_F.thisSysMsg},
      {role: "user", content: prompt}
    ],
    temperature: AICouncilTraits.AI_F.thisTemp,
    max_tokens: 2000,
    top_p: AICouncilTraits.AI_F.thisTopP,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  console.log("elicitOpinionAI_E Response: "+response.data.choices[0].message.content);
  console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
  conv_history_AI_F.push({role: "assistant", content: response.data.choices[0].message.content});
  return response.data.choices[0].message.content;
}

async function elicitOpinionAI_G(prompt) {
  const response=processQueryAndReturnResponse(query=prompt);
  return response;
};

const AICouncil = {
  'AI_A':elicitOpinionAI_A,//GPT-4; temperature: 0
  'AI_B':elicitOpinionAI_B,//GPT-4; temperature: 0.5
  'AI_C':elicitOpinionAI_C,//GPT-4; temperature: 1
  'AI_D':elicitOpinionAI_D,//GPT-4; temperature: 0
  'AI_E':elicitOpinionAI_E,//GPT-4; temperature: 0.5
//  'AI_F':elicitOpinionAI_E,//GPT-4; temperature: 1  
//  'AI_G':elicitOpinionAI_F//librarian
};

// This endpoint kicks off the discussion
app.post('/initiateDiscussion', async (req, res) => {
  console.log("=====================================================");
  console.log("in initiateDiscussion");
  discussionState.prompt = req.body.prompt;
  discussionState.originalPrompt = req.body.prompt;
  discussionState.round = 0;
  discussionState.responses = [];
  discussionState.disagreements = [];
  discussionState.consensusReached = false;

//  res.json({ message: "Discussion initiated" });

  console.log("initiateDiscussion: "+discussionState.prompt);
  console.log("discussionState.prompt: "+discussionState.prompt);
  console.log("=====================================================");
  if(initialize_AI_Council==0){
    console.log("initialize_AI_Council - PRE: "+initialize_AI_Council);
    initialize_AI_Council=1;
    console.log("initialize_AI_Council - POST: "+initialize_AI_Council);
    const AICouncilInitialized = await initializeCouncilSystemPrompt(discussionState.prompt);
  };

  queryPermsArray.push(discussionState.prompt)//this is for the librarian AI code
  proceedWithRound(discussionState.prompt);
});

const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

let round=0;
async function proceedWithRound(thisPrompt) {
  round=round+1;
  console.log("=====================================================");
  console.log("proceedWithRound with thisPrompt: "+thisPrompt);
  console.log("=====================================================");
  let facilitatorMsg="<strong>[Round "+round+"]:</strong> "+thisPrompt;
  io.emit('messages', {agentId: "Facilitator", text: facilitatorMsg, typeOfMsg:"Facilitator making prompt"});

  // Use Promise.all to wait for all agents to respond
  const responses = await Promise.all(
    Object.entries(AICouncil).map(async ([agentId, elicitOpinion]) => {
      console.log("---WAITING BETWEEN REQUEST---");
      await sleep(3000);  // Sleep for >1ms: openai's rate limited to 1ms between requests
      console.log("---CONTINUING WITH REQUEST---");
      const response = await elicitOpinion(thisPrompt); // This will call the function specific to the member
      io.emit('messages', {agentId: agentId, text: response, typeOfMsg:"Response from AI Council Member"});
      console.log("---RETURNED THIS REQUEST---");      
      return {agentId: agentId, text: response};
    })
  );

  // Update the state
  discussionState.responses = responses;
//  io.emit('discussionState', discussionState);

  // Calling LLM API to analyze the responses and see if there's consensus or disagreement
  console.log("Responses to analyze for agreement or disagreement; sending to analyzeResponses: "+responses);
  for(i=0;i<responses.length;i++){
    console.log("Response "+i+1+" | "+responses[i]);    
  }

  const consensusOrDisagreement = await analyzeResponses(responses);

  // If there's consensus, we're done
  if (consensusOrDisagreement.consensus) {
    discussionState.consensusReached = true;
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~THERE IS A CONSENSUS: consensusOrDisagreement.consensus: "+consensusOrDisagreement.consensus+" | discussionState.consensusReached: "+discussionState.consensusReached)
    const consensusStatement = await synthesizeResponsesForConsensus(discussionState.responses)
    io.emit('messages',{agentId:'Facilitator', text: consensusStatement, round, typeOfMsg:"ConsensusReached"})
//    io.emit('discussionState', discussionState);
    return;
  }

  // If there's disagreement and we're not yet at the max round, we need to formulate a new prompt and start a new round
  if (discussionState.round < 21) {
    console.log("discussionState.round: "+discussionState.round);
    discussionState.round++;
    discussionState.disagreements.push(consensusOrDisagreement.disagreements);
    //push the disagreements array from analyzeResponses to the discussionState object
    discussionState.prompt = await formulateNewPrompt(discussionState.disagreements);

    console.log("discussionState.prompt: "+discussionState.prompt);
    proceedWithRound(discussionState.prompt);
  } else {
    // If we're at the max round, we're also done, even if there's no consensus
    io.emit('discussionState', discussionState);
  }
}

async function callOpenAI_compareQs(AIReponsesToCompare){
  await sleep(3000);
  console.log("_____________________________________START_____________________________________________");
  console.log("Sending statements to compare to LLM: "+AIReponsesToCompare);
  console.log("______________________________________END______________________________________________");
  const response = await openai.createChatCompletion({
    model: "gpt-4o", //gpt-3.5-turbo-0301 or gpt-4
    messages: [
      {role: "system", content: "Your name is agree-or-disagree bot. You are a very smart bot that only responds with the word 'agree' or 'disagree'. You are very good at comparing 2 pieces of text. If the two texts conceptually agree with each other you respond with 'agree'. If the two texts do not conceptually agree with each other you respond with 'disagree'. You do not provide an explanation. You are a one-word bot that only responds with the words 'agree' or 'disagree'."},
      {role: "user", content: "Do the following text agree with each other or not? ["+AIReponsesToCompare+"]"}
    ],
    temperature: 0,
    max_tokens: 2000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  console.log("callOpenAI_compareQs Response: "+response.data.choices[0].message.content);
  return response.data.choices[0].message.content;
};

async function callOpenAI_formulateFollowupPrompt(AIResponsesToClarify){
  await sleep(3000);
  const response = await openai.createChatCompletion({
    model: "gpt-4o", //gpt-3.5-turbo-0301 or gpt-4
    messages: [
  //      {role: "system", content: "You are a very smart discussion facilitator bot that is good at formulating chain-of-thought questions to clarify differences between responses from multiple different persons."},
      {role: "system", content: "You are a summarizing and differentiating bot for the AI Council. You first summarize each individual council member's response. Then you identify the key premises and logic that distingushes differing perspectives."},
      {role: "user", content: AIResponsesToClarify}
    ],
    temperature: 0,
    max_tokens: 2000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });
  console.log("callOpenAI_formulateFollowupPrompt RESPONSE: ")
  return response.data.choices[0].message.content;
};

// Calling LLM API to analyze the responses and return
async function analyzeResponses(responses) {
  await sleep(3000);
  console.log("|||||||||||||||||||||||||||||||||||START||||||||||||||||||||||||||||||||||||");
  console.log("in analyzeResponses with responses: ", responses);
  try{
    // Make an array to store the disagreements
    let disagreements = [];

    // Compare each pair of responses
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const comparisonPrompt = `Compare these two statements:\n\n1. "${responses[i].text}" from ${responses[i].agentId}\n2. "${responses[j].text}" from ${responses[j].agentId}\n\nDo these two statements agree with each other, or do they disagree?`;
        console.log("Sending statements to compare to LLM: ", comparisonPrompt);
        const comparisonResponse = await callOpenAI_compareQs(comparisonPrompt);
        console.log("|||||||||||||||||||||||||||||||||||BACK IN analyzeResponses||||||||||||||||||||||||||||||||||||");
        console.log("Back in analyzeResponses() with callOpenAI_compareQs response: ", comparisonResponse);        

        // If the AI says they disagree, store the pair in the disagreements array
        if (comparisonResponse.toLowerCase().includes('disagree')) {
          disagreements.push({
            disagreement: [responses[i], responses[j]],
            reason: comparisonResponse,
          });
        }
      }
    }

    // If there are any disagreements, return the disagreements
    if (disagreements.length > 0) {
      console.log("There is a disagreement: ", disagreements);
      for(i=0;i<disagreements.length;i++){
        console.log("There is a disagreement: ", disagreements[i].disagreement[0].agentId+" vs "+disagreements[i].disagreement[1].agentId);
        console.log("["+disagreements[i].disagreement[0].text+"] vs ["+disagreements[i].disagreement[1].text+"]");
      };
      return { consensus: false, disagreements };
    } else {
      // If there are no disagreements, return consensus
      console.log("There is a consensus");
      return { consensus: true };
    }
  }catch (error){
    // If there's an error, log it and return an object indicating no consensus
    console.error(`Error in analyzeResponses: ${error}`);
    return { consensus: false };
  }
  console.log("||||||||||||||||||||||||||||||||END|||||||||||||||||||||||||||||||||||||||");  
}

// Function to call LLM API to formulate a new prompt based on the disagreements so far
async function formulateNewPrompt(theseDisagreements) {
  console.log("******************************************************************");
  console.log("in formulateNewPrompt with disagreements: "+theseDisagreements);
  console.log(theseDisagreements);
  console.log("in formulateNewPrompt with disagreements.values: "+Object.values(theseDisagreements));
  console.log(Object.values(theseDisagreements));
  console.log("in formulateNewPrompt with Object.getOwnPropertyNames(object1): "+Object.getOwnPropertyNames(theseDisagreements));
  console.log(Object.getOwnPropertyNames(theseDisagreements));
  console.log("******************************************************************");

  const firstDisagreement = [theseDisagreements[0][0].disagreement[0].text,theseDisagreements[0][0].disagreement[1].text];
  console.log("firstDisagreement: "+firstDisagreement);

//  const prompt = "Given these two statements: 1. ["+firstDisagreement[0]+"] and 2. ["+firstDisagreement[1]+"], formulate a question that would help to clarify the disagreement between these two statements.";

  let opinionString="";
  for(i=0;i<discussionState.responses.length;i++){
    if(i==0){
      opinionString="["+discussionState.responses[i].agentId+"'s opinion: "+discussionState.responses[i].text+"]";
    }else{
      opinionString=opinionString+", ["+discussionState.responses[i].agentId+"'s opinion: "+discussionState.responses[i].text+"]";      
    };
  };
  console.log("opinionString "+i+1+" | "+opinionString);    
  const prompt = "Summarize the following opinions from council members: "+opinionString+". Provide the summary and formulate a question that can be asked to council members that would help clarify the disagreements between their opinions.";

  // Call the OpenAI API with this prompt to generate the new question.
  const newQuestion = await callOpenAI_formulateFollowupPrompt(prompt);

  completedNewQuestion=newQuestion+". Based on your preceding response, how would you answer the original question: ["+discussionState.originalPrompt+"]";
  return completedNewQuestion;
}

async function synthesizeResponsesForConsensus(theseResponses){
  await sleep(3000);
  let opinionString="";
  for(i=0;i<theseResponses.length;i++){
    if(i==0){
      opinionString="["+theseResponses[i].agentId+"'s opinion: "+theseResponses[i].text+"]";
    }else{
      opinionString=opinionString+", ["+theseResponses[i].agentId+"'s opinion: "+theseResponses[i].text+"]";      
    };
  };
  console.log("opinionString "+i+1+" | "+opinionString);    
  const prompt = "Synthesize the following responses into a consensus statement: ["+opinionString+"], which responds to the following prompt: ["+discussionState.originalPrompt+"]";

  const response = await openai.createChatCompletion({
    model: "gpt-4o", //gpt-3.5-turbo-0301 or gpt-4
    messages: [
      {role: "system", content: "You are a synthesis and responding bot. You synthesize statements in a lucid, step-by-step way."},
      {role: "user", content: prompt}
    ],
    temperature: 0,
    max_tokens: 2000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  console.log("SYNTHESIZED RESPONSE: "+response.data.choices[0].message.content);
  return response.data.choices[0].message.content;
};

// Define the function to get the points of disagreement from the responses
app.post('/getDisagreements', async (req, res) => {
  const responses = req.body.responses;
  const prompt = `Identify the points of disagreement in the following responses: ${responses.join(' ')}`;
  const disagreementPoints = await generateResponse(prompt);

  res.json({ disagreements: disagreementPoints.split(', ').map(point => point) });
});

// Define the function to construct a new prompt based on the points of disagreement
app.post('/constructNewPrompt', (req, res) => {
});
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***********************************************************************************/
/***********************************************************************************/
/***********************************************************************************/
/******************AI COUNCIL MEMBER THAT CAN ACCESS A KNOWLEDGE CORPUS*************/
/***********************************************************************************/
/***********************************************************************************/
/***********************************************************************************/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
/***EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL*EXPERIMENTAL***/
var reasoningLevel="";
var resSumMethod="";
var gl_responsesString="";
var gl_responsesArray=[];
var gl_interleavedChunksArray=[];

var thisIteration_getEmbeddingForQuery=0;
var thisIteration_processQueryAndReturnResponse=0;
var thisIteration_sendVectorToVectorDB=0;
var thisIteration_searchVectorDB=0;
var thisIteration_processText=0;

var thresholdSelected;
var qualityThreshold;
var numTriesOfQueryPermutation=0;
var queryPermsArray=[];

var respAndSourcesArray=[];

var startResponse_LLMorCorpus;

var userSelectedNamespace;

selectedModelSynth="gpt-4o";
selectedModelItr="gpt-4o";
maxNumVecs=5;
selectedReasoningLevel="notCreative";
typeOfResponseAlg="DirResp";
userThresholdSelected=false;
userQualityThreshold=7;
startingPoint="corpus";
selectedNamespace="poc-USMLEGPT-cid";//"poc-USMLEGPT","poc-USMLEGPT-cid"
queryPermsArray=[];
reasoningLevel=selectedReasoningLevel;
resSumMethod=typeOfResponseAlg;
//queryPermsArray.push(query);
thresholdSelected=userThresholdSelected;
qualityThreshold=userQualityThreshold;
startResponse_LLMorCorpus=startingPoint;
userSelectedNamespace=selectedNamespace;


function trackIteration(functionName){
  console.log("**************************************************");
  console.log("From Function: "+functionName);
  console.log("thisIteration_getEmbeddingForQuery: "+thisIteration_getEmbeddingForQuery);
  console.log("thisIteration_processQueryAndReturnResponse: "+thisIteration_processQueryAndReturnResponse);
  console.log("thisIteration_sendVectorToVectorDB: "+thisIteration_sendVectorToVectorDB);
  console.log("thisIteration_searchVectorDB: "+thisIteration_searchVectorDB);
  console.log("thisIteration_processText: "+thisIteration_processText);
  console.log("**************************************************");
};

async function processQueryAndReturnResponse(query) {
  thisIteration_processQueryAndReturnResponse=thisIteration_processQueryAndReturnResponse+1;
  trackIteration("processQueryAndReturnResponse");
  //1. Create a query vector: vector from a query - use opeani embeddings
  async function getEmbeddingForQuery(query) {
    thisIteration_getEmbeddingForQuery=thisIteration_getEmbeddingForQuery+1;
    trackIteration("thisIteration_getEmbeddingForQuery");
    const apiKey = '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';
    const url = 'https://api.openai.com/v1/embeddings';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    const data = {
      input: query,
      model: 'text-embedding-ada-002'
    };
    const response = await axios.post(url, data, { headers });
    return response.data;
  }

  //2. Use vectorized query to search pinecone vector database for similar vectors
  const PineconeClient = require("@pinecone-database/pinecone").PineconeClient;

  async function searchVectorDB(thisQueryVector) {
    thisIteration_searchVectorDB=thisIteration_searchVectorDB+1;
    trackIteration("searchVectorDB");
    const pinecone = new PineconeClient();
    await pinecone.init({
      environment: "us-west4-gcp",
      apiKey: "3331a43f-61a8-47c8-a54f-8c27e383f99d"
    });

    const index = pinecone.Index("langchain1-index");
    let maxNumOfVectors=maxNumVecs;
    console.log("maxNumVecs: "+maxNumVecs+"| maxNumOfVectors: "+maxNumOfVectors);
    let queryRequest;
    if(userSelectedNamespace=="poc-NCATS-Literature"){
      queryRequest = {
        vector: thisQueryVector,
        topK: maxNumOfVectors,
        includeValues: true,
        includeMetadata: true,
        namespace: "poc-NCATS",
        filter:{typeOfSource:{$in:['Literature']}
        }
      };
    }else if(userSelectedNamespace=="poc-NCATS-Interviews"){
      queryRequest = {
        vector: thisQueryVector,
        topK: maxNumOfVectors,
        includeValues: true,
        includeMetadata: true,
        namespace: "poc-NCATS",
        filter:{typeOfSource:{$in:['Interviews']}}
      }
    }else if(userSelectedNamespace=="poc-NCATS-Lit-NNDS"){
      queryRequest = {
        vector: thisQueryVector,
        topK: maxNumOfVectors,
        includeValues: true,
        includeMetadata: true,
        namespace: "poc-NCATS",
        filter:{typeOfSource:{$in:['LiteratureNativeNationsDataSov']}}
      }
    }else{
      queryRequest = {
        vector: thisQueryVector,
        topK: maxNumOfVectors,
        includeValues: true,
        includeMetadata: true,
        namespace: userSelectedNamespace
      };
    };
    const queryResponse = await index.query({ queryRequest });
    console.log("==============result from querying vector db w/ vectorized query=============");
    console.log("==top maxNumOfVectors vectors that have greatest cosine similarity with vectorized query==");
    console.log(queryResponse);
    console.log("=============================================================================");

    console.log("========================queryResponse.matches[i].id==========================");
    for(i=0;i<maxNumOfVectors;i++){
      console.log("queryResponse.matches["+i+"].id: "+queryResponse.matches[i].id);
    };
    console.log("=============================================================================");

    console.log("==================queryResponse.matches[i].metadata.text=====================");
    let concactenatedResources = "";
    respAndSourcesArray=[];
    var empty_query_vector = new Array(1536).fill(0.1);

    for (let i = 0; i < maxNumOfVectors; i++) {
      console.log("---------------------------------------------------------------------------")
      console.log("===> queryResponse.matches["+i+"].id: "+queryResponse.matches[i].id);
      console.log("===> queryResponse.matches["+i+"].metadata.chunkID1: "+queryResponse.matches[i].metadata.chunkID1);
      console.log("===> queryResponse.matches["+i+"].metadata.text: "+queryResponse.matches[i].metadata.text);
      concactenatedResources = concactenatedResources +"; "+queryResponse.matches[i].metadata.text+" (DOCUMENT SOURCE: "+queryResponse.matches[i].metadata.source+")";
      respAndSourcesArray.push({"resp":queryResponse.matches[i].metadata.text, "source":queryResponse.matches[i].metadata.source});
      console.log("===> queryResponse.matches["+i+"].metadata.source: "+queryResponse.matches[i].metadata.source);
      console.log("---------------------------------------------------------------------------")
    };

    //retrieve context of retrieved vectors
/*
    _context_window=[];
    pre_and_post_context_window=3;
    for(i=0;i<queryResponse.matches.length;i++){
      for(j=0;j<pre_and_post_context_window;j++){
        _context_window.push(queryResponse.matches[i].metadata.chunkID1-(pre_and_post_context_window-j))
      };
      _context_window.push(queryResponse.matches[i].metadata.chunkID1)
      for(j=1;j=pre_and_post_context_window;j++){
        _context_window.push(queryResponse.matches[i].metadata.chunkID1+j)
      };
    };
*/
    let _context_window = [];
    const pre_and_post_context_window = 3;

    for(let i = 0; i < queryResponse.matches.length; i++) {
      let maxChunkID=queryResponse.matches[i].metadata.chunkID1+pre_and_post_context_window+1;
      for(let j = 0; j < pre_and_post_context_window; j++) {
        // Make sure the value is within bounds (if applicable)
        let value = queryResponse.matches[i].metadata.chunkID1 - (pre_and_post_context_window - j);
        if (value >= 0) _context_window.push(value);
      }
      
      _context_window.push(queryResponse.matches[i].metadata.chunkID1);

      for(let j = 1; j <= pre_and_post_context_window; j++) {
        // Make sure the value is within bounds (if applicable)
        let value = queryResponse.matches[i].metadata.chunkID1 + j;
        if (value < maxChunkID) _context_window.push(value);
      }
    }

    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("Context Window");
    console.log(_context_window);
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
/*
    const vectorsContexts = await index.query({
      vector: empty_query_vector,
      namespace:"poc-USMLEGPT-cid",
      filter:{
          chunkID1: {"$in": _context_window}
      },
      topK: _context_window.length,
      includeMetadata: true,    
    });
*/    
    console.log("empty_query_vector", empty_query_vector);
    const vectorsContexts = await index.query({
      queryRequest: {
        vector: empty_query_vector,
        namespace: "poc-USMLEGPT-cid",
        filter: {
            "chunkID1": {"$in": _context_window}
        },
        topK: _context_window.length,
        includeMetadata: true
      }
    });
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("Vectors Context");
    console.log(vectorsContexts);
    console.log("vectorsContexts.length: "+vectorsContexts.length);
    let _vectorsContexts=[];
    for (let i = 0; i < vectorsContexts.matches.length; i++) {
      console.log("---------------------------------------------------------------------------")
      console.log("===> vectorsContexts.matches["+i+"].metadata.text: "+vectorsContexts.matches[i].metadata.chunkID1+": "+vectorsContexts.matches[i].metadata.text);
      thisContext=vectorsContexts.matches[i].metadata.chunkID1.toString() +": "+vectorsContexts.matches[i].metadata.text;
      console.log("thisContext: "+thisContext);
      _vectorsContexts.push(thisContext);
//      concactenatedResources = concactenatedResources +"; "+queryResponse.matches[i].metadata.text+" (DOCUMENT SOURCE: "+queryResponse.matches[i].metadata.source+")";
//      respAndSourcesArray.push({"resp":queryResponse.matches[i].metadata.text, "source":queryResponse.matches[i].metadata.source});
      console.log("---------------------------------------------------------------------------")
    };
    _vectorsContexts.sort();
    console.log("_vectorsContexts:");
    console.log(_vectorsContexts);

    const syntehsizedContext = await openai.createChatCompletion({
        model: "gpt-4o", //gpt-3.5-turbo-0301 or gpt-4
        messages: [
          {role: "system", content: "You are a smart and helpful biomedical bot. You are good at synthesizing and summarizing concepts."},
          {role: "user", content: "Synthesize and summarize the following excerpts from a textbook: " + _vectorsContexts}
        ],
        temperature: 0,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
    console.log("syntehsizedContext: ");
    console.log(syntehsizedContext.config.data);



    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")


    console.log("=============================================================================");

    console.log("=======================Concactenated Resources===============================");
    console.log(concactenatedResources);
    console.log("=============================================================================");

    // Return query results
    return concactenatedResources;
  };

  //3. Process text to chunk it out into sizes that don't exceed the token limit of openai
  async function processText(concactenatedResources){
    thisIteration_processText=thisIteration_processText+1;
    trackIteration("processText");    
    const text = concactenatedResources;
    const chunkSize = 500;
    const overlapSize = 100;

    // Chunk function for words
    function chunkWords(text, chunkSize) {
      const stringWithoutNewlines = text.replace(/\n/g, '');
      const thisText = stringWithoutNewlines.split(" ");
      const chunks = [];
      for (let i = 0; i < thisText.length; i += chunkSize) {
        chunks.push(thisText.slice(i, i + chunkSize));
      }
      return chunks;
    }

    // Overlap function for words
    function interleaveWordChunks(text, chunkSize, overlapSize) {
      const chunkedText = chunkWords(text, chunkSize);
      console.log("=================================chunkedText============================");
      console.log(chunkedText);
      console.log("========================================================================");

      const interleavedChunks = [];
      for (let i = 0; i < chunkedText.length - 1; i++) {
        interleavedChunks.push(chunkedText[i].join(" "));
        const overlapChunk = chunkedText[i].slice(-overlapSize).concat(chunkedText[i + 1].slice(0, overlapSize));
        interleavedChunks.push(overlapChunk.join(" "));
      };

      // Add the last chunk
      interleavedChunks.push(chunkedText[chunkedText.length - 1].join(" "));
      return interleavedChunks;
    };

    const interleavedChunksArray = interleaveWordChunks(text, chunkSize, overlapSize);
    console.log("Interleaved Chunks length |  interleavedChunksArray:", interleavedChunksArray.length, " | ", interleavedChunksArray);
    gl_interleavedChunksArray=interleavedChunksArray;
    return interleavedChunksArray;    
  };

  async function synthesizeIntoNLResponse_notcreative(resourcesArray) {
    if(startResponse_LLMorCorpus=="LLM"){
      console.log("in synthesizeIntoNLResponse_notcreative; startResponse_LLMorCorpus="+startResponse_LLMorCorpus);
      var thisResponse=await startResponseWithLLM(resourcesArray);
      return thisResponse;
    }else if(startResponse_LLMorCorpus=="corpus"){
      console.log("in synthesizeIntoNLResponse_notcreative; startResponse_LLMorCorpus="+startResponse_LLMorCorpus);
      //since vector db may return a size of response that is greater than the number of tokens processed by openai api, it was chunked
      //above into an array of ~<1000 tokens per element. These are passed with the prompt iteratively. The reponses from each iteration
      //are then joined into one string and sent back to openai along with the query to get the final natural language response that 
      //takes into account all the resources (i.e synthesizes all the responses into one response)
      let responsesArray=[];
      if(selectedModelItr=="text-davinci-003"){
        for(i=0;i<resourcesArray.length;i++){
          const response_eachsegment = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: "Answer the following biomedical query using 'my internal database': "+query+". If the information provided by 'my internal database' does not directly answer the query, then do not respond with language but respond numerically with the following number: 101. Use only the following resources, 'my internal database', to answer the query - 'my internal database': "+resourcesArray[i]+".",
            temperature: 0,
            max_tokens: 2000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          });  
          responsesArray.push(response_eachsegment.data.choices[0].text);
          console.log(response_eachsegment.data.choices[0].text);
        };
      }else if(selectedModelItr=="gpt-3.5-turbo-0301"||selectedModelItr=="gpt-4o"){
        for(i=0;i<resourcesArray.length;i++){
          const response_eachsegment = await openai.createChatCompletion({
            model: selectedModelSynth, //gpt-3.5-turbo-0301 or gpt-4
            messages: [
              {role: "system", content: "You are a smart and helpful biomedical bot. You understand preclinical therapuetics to mean: formulation development ( assesses the best way to prepare a drug in the preclinical phase for its intended clinical use in patients. Factors such as solubility, frequency and mode of administration, stability of the formula, and palatability are all assessed), pharmacology (assesses the safety of a drug as well as its ADME – Absorption and the bioavailability of the drug once administered; Distribution; Metabolism; and Excretion), and toxicology ( safety assessment of a drug monitors both pharmacodynamic (PD) and pharmacokinetic (PK) interactions. PD interactions are where the drug administered can affect the actions of another specified drug without affecting its concentration. PK interactions are where the drug administered can affect the actions of another specified drug by affecting its concentration or that of its metabolites)."},
              {role: "user", content: "Answer the following biomedical query using 'my internal database': " + query + ". If the information provided by 'my internal database' does not directly answer the query, then do not respond with language but respond numerically with the following number: 101. Use only the following resources, 'my internal database', to answer the query - 'my internal database': " + resourcesArray[i] + "."}
//            {role: "user", content: "Answer the following biomedical query using 'my internal database'. QUERY: " + query + ". If the information provided by 'my internal database' does not directly answer the query, then do NOT answer the query. Use only the following resources, 'my internal database', to answer the query - 'my internal database': " + resourcesArray[i] + "Remember, you MUST only use 'my internal database' to answer the question."}
            ],
            temperature: 0,
            max_tokens: 2000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          });
          responsesArray.push(response_eachsegment.data.choices[0].message.content);
          console.log("~~~~~~~~~~~~~~~~~~~RESOURCES ARRAY["+i+"]:"+resourcesArray[i]+"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");        
          console.log("~~~~~~~~~~~~response_eachsegment.data.choices[0].message.content:"+response_eachsegment.data.choices[0].message.content+"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        };
      };
      console.log("==============RESPONSES ARRAY==================");
      console.log(responsesArray);
      console.log("===============================================");
      var responsesString = responsesArray.join(" ");
      console.log("==============RESPONSES STRING==================");
      console.log(responsesString);
      console.log("================================================");
      //Return the responsesString to display
//      return responsesString;
      gl_responsesString=responsesString;
      gl_responsesArray=responsesArray;

      let maxTokens = "";
      if(selectedModelSynth=="gpt-3.5-turbo-0301"){
        maxTokens=700;
      }else if(selectedModelSynth=="gpt-4o"){
        maxTokens=4000;
      };

      //responding to query
      // For a very large number of vectors, initial responses make an array (responsesArray, above), whose
      //string would be too big too pass to construct a response (exceeds token limit). So, can use resSumMethod=RecSumResp,
      //where the algorithm recursively looks at the array of responses 3 elements at a time, then constructs a new array 
      //and continues to process that array until an array w/ a single element remains

      if(resSumMethod=="RecSumResp"){
        console.log("resSumMethod=RecSumResp");
        const inputArray = responsesArray;
        const finalArray = await processArray(query,inputArray,maxTokens,selectedModelSynth);
        console.log("================~~~~~~~~~~~~~~~~FINAL ARRAY~~~~~~~~~~~~======================");
        console.log("finalArray: "+finalArray); // This will output an array with a single element
        console.log("finalArray[0]: "+finalArray[0]); // This will output an array with a single element
        console.log("================~~~~~~~~~~~~~~~~-----------~~~~~~~~~~~~======================");
        var NLresponse=finalArray[0];
        console.log("resSumMethod==RecSumResp | NLresponse: "+NLresponse)
        var NLresponseGrade=await evaluateQualityOfResponse(NLresponse,maxTokens,selectedModelSynth);
        //if user only wants a response if it's above a certain threshold 
        var thisResponse=await checkResponseQualityThresholdAndQperm(NLresponse,NLresponseGrade);
        return thisResponse;
      }else if(resSumMethod=="DirResp"){
        console.log("resSumMethod=DirResp");
        const response_total = await openai.createChatCompletion({
          model: selectedModelSynth, //gpt-3.5-turbo-0301 or gpt-4
          messages: [
//            {role: "system", content: "You are a smart and helpful biomedical bot."},
            {role: "system", content: "You are a smart and helpful biomedical bot. You understand preclinical therapuetics to mean: formulation development ( assesses the best way to prepare a drug in the preclinical phase for its intended clinical use in patients. Factors such as solubility, frequency and mode of administration, stability of the formula, and palatability are all assessed), pharmacology (assesses the safety of a drug as well as its ADME – Absorption and the bioavailability of the drug once administered; Distribution; Metabolism; and Excretion), and toxicology ( safety assessment of a drug monitors both pharmacodynamic (PD) and pharmacokinetic (PK) interactions. PD interactions are where the drug administered can affect the actions of another specified drug without affecting its concentration. PK interactions are where the drug administered can affect the actions of another specified drug by affecting its concentration or that of its metabolites)."},
            {role: "user", content: "Answer the following biomedical query using 'my internal database': " + query + ". If the information provided by 'my internal database' does not directly answer the query, then use your reasoning to answer the question. Resources to use to answer the query before using your own reasoning - 'my internal database': " + responsesString + "."}
          ],
          temperature: 0,
          max_tokens: maxTokens,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        });
        var NLresponse=response_total.data.choices[0].message.content;
        console.log("resSumMethod==DirResp | NLresponse: "+NLresponse)
        var NLresponseGrade=await evaluateQualityOfResponse(NLresponse,maxTokens,selectedModelSynth);
        //if user only wants a response if it's above a certain threshold 
        var thisResponse=await checkResponseQualityThresholdAndQperm(NLresponse,NLresponseGrade);
        return thisResponse;
      };
    };
  };


  async function synthesizeIntoNLResponse_creative(resourcesArray) {
    if(startResponse_LLMorCorpus=="LLM"){
      console.log("in synthesizeIntoNLResponse_creative; startResponse_LLMorCorpus="+startResponse_LLMorCorpus);
      var thisResponse=await startResponseWithLLM(resourcesArray);
      return thisResponse;
    }else if (startResponse_LLMorCorpus=="corpus"){
      console.log("in synthesizeIntoNLResponse_creative; startResponse_LLMorCorpus="+startResponse_LLMorCorpus);
      //since vector db may return a size of response that is greater than the number of tokens processed by openai api, it was chunked
      //above into an array of ~<1000 tokens per element. These are passed with the prompt iteratively. The reponses from each iteration
      //are then joined into one string and sent back to openai along with the query to get the final natural language response that 
      //takes into account all the resources (i.e synthesizes all the responses into one response)
      let responsesArray=[];
      if(selectedModelItr=="text-davinci-003"){
        for(i=0;i<resourcesArray.length;i++){
          const response_eachsegment = await openai.createCompletion({
            model: "text-davinci-003",
//            prompt: "Answer the following biomedical query using 'my internal database': "+query+". If the information provided by 'my internal database' does not directly answer the query, then do not respond with language but respond numerically with the following number: 101. Use only the following resources, 'my internal database', to answer the query - 'my internal database': "+resourcesArray[i]+".",
            prompt: "Answer the following biomedical query by synthesizing 'my internal database sources': " + query + ". If the information provided by 'my internal database sources' does not directly answer the query, then use your reasoning to answer the question. Resources to synthesize to answer the query before using your own reasoning - 'my internal database sources': " + responsesString + ".",
            temperature: 1,
            max_tokens: 2000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          });  
          responsesArray.push(response_eachsegment.data.choices[0].text);
          console.log(response_eachsegment.data.choices[0].text);
        };
      }else if(selectedModelItr=="gpt-3.5-turbo-0301"||selectedModelItr=="gpt-4o"){
        for(i=0;i<resourcesArray.length;i++){
          const response_eachsegment = await openai.createChatCompletion({
            model: selectedModelSynth, //gpt-3.5-turbo-0301 or gpt-4
            messages: [
//              {role: "system", content: "You are a smart and helpful biomedical bot."},
              {role: "system", content: "You are a smart and helpful biomedical bot. You understand preclinical therapuetics to mean: formulation development ( assesses the best way to prepare a drug in the preclinical phase for its intended clinical use in patients. Factors such as solubility, frequency and mode of administration, stability of the formula, and palatability are all assessed), pharmacology (assesses the safety of a drug as well as its ADME – Absorption and the bioavailability of the drug once administered; Distribution; Metabolism; and Excretion), and toxicology ( safety assessment of a drug monitors both pharmacodynamic (PD) and pharmacokinetic (PK) interactions. PD interactions are where the drug administered can affect the actions of another specified drug without affecting its concentration. PK interactions are where the drug administered can affect the actions of another specified drug by affecting its concentration or that of its metabolites)."},
//              {role: "user", content: "Answer the following biomedical query using 'my internal database': " + query + ". If the information provided by 'my internal database' does not directly answer the query, then do not respond with language but respond numerically with the following number: 101. Use only the following resources, 'my internal database', to answer the query - 'my internal database': " + resourcesArray[i] + "."}
              {role: "user", content: "Answer the following biomedical query by synthesizing 'my internal database sources': " + query + ". If the information provided by 'my internal database sources' does not directly answer the query, then use your reasoning to answer the question. Resources to synthesize to answer the query before using your own reasoning - 'my internal database sources': " + responsesString + "."}
            ],
            temperature: 1,
            max_tokens: 2000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
          });
          responsesArray.push(response_eachsegment.data.choices[0].message.content);
          console.log("~~~~~~~~~~~~~~~~~~~RESOURCES ARRAY["+i+"]:"+resourcesArray[i]+"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");        
          console.log("~~~~~~~~~~~~response_eachsegment.data.choices[0].message.content:"+response_eachsegment.data.choices[0].message.content+"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        };
      };
      console.log("==============RESPONSES ARRAY==================");
      console.log(responsesArray);
      console.log("===============================================");
      var responsesString = responsesArray.join(" ");
      console.log("==============RESPONSES STRING==================");
      console.log(responsesString);
      console.log("================================================");
      //Return the responsesString to display
//      return responsesString;
      gl_responsesString=responsesString;
      gl_responsesArray=responsesArray;

      let maxTokens = "";
      if(selectedModelSynth=="gpt-3.5-turbo-0301"){
        maxTokens=700;
      }else if(selectedModelSynth=="gpt-4o"){
        maxTokens=4000;
      };

      //responding to query
      // For a very large number of vectors, initial responses make an array (responsesArray, above), whose
      //string would be too big too pass to construct a response (exceeds token limit). So, can use resSumMethod=RecSumResp,
      //where the algorithm recursively looks at the array of responses 3 elements at a time, then constructs a new array 
      //and continues to process that array until an array w/ a single element remains

      if(resSumMethod=="RecSumResp"){
        console.log("resSumMethod=RecSumResp");
        const inputArray = responsesArray;
        const finalArray = await processArray(query,inputArray,maxTokens,selectedModelSynth);
        console.log("================~~~~~~~~~~~~~~~~FINAL ARRAY~~~~~~~~~~~~======================");
        console.log("finalArray: "+finalArray); // This will output an array with a single element
        console.log("finalArray[0]: "+finalArray[0]); // This will output an array with a single element
        console.log("================~~~~~~~~~~~~~~~~-----------~~~~~~~~~~~~======================");
        var NLresponse=finalArray[0];
        console.log("resSumMethod==RecSumResp | NLresponse: "+NLresponse)
        var NLresponseGrade=await evaluateQualityOfResponse(NLresponse,maxTokens,selectedModelSynth);
        //if user only wants a response if it's above a certain threshold 
        var thisResponse=await checkResponseQualityThresholdAndQperm(NLresponse,NLresponseGrade);
        return thisResponse;
      }else if(resSumMethod=="DirResp"){
        console.log("resSumMethod=DirResp");
        const response_total = await openai.createChatCompletion({
          model: selectedModelSynth, //gpt-3.5-turbo-0301 or gpt-4
          messages: [
//            {role: "system", content: "You are a smart and helpful biomedical bot."},
            {role: "system", content: "You are a smart and helpful biomedical bot. You understand preclinical therapuetics to mean: formulation development ( assesses the best way to prepare a drug in the preclinical phase for its intended clinical use in patients. Factors such as solubility, frequency and mode of administration, stability of the formula, and palatability are all assessed), pharmacology (assesses the safety of a drug as well as its ADME – Absorption and the bioavailability of the drug once administered; Distribution; Metabolism; and Excretion), and toxicology ( safety assessment of a drug monitors both pharmacodynamic (PD) and pharmacokinetic (PK) interactions. PD interactions are where the drug administered can affect the actions of another specified drug without affecting its concentration. PK interactions are where the drug administered can affect the actions of another specified drug by affecting its concentration or that of its metabolites)."},
//            {role: "user", content: "Answer the following biomedical query using 'my internal database': " + query + ". If the information provided by 'my internal database' does not directly answer the query, then use your reasoning to answer the question. Resources to use to answer the query before using your own reasoning - 'my internal database': " + responsesString + "."},
            {role: "user", content: "Answer the following biomedical query by synthesizing 'my internal database sources': " + query + ". If the information provided by 'my internal database sources' does not directly answer the query, then use your reasoning to answer the question. Resources to synthesize to answer the query before using your own reasoning - 'my internal database sources': " + responsesString + "."}
          ],
          temperature: 0,
          max_tokens: maxTokens,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        });
        var NLresponse=response_total.data.choices[0].message.content;
        console.log("resSumMethod==DirResp | NLresponse: "+NLresponse)
        var NLresponseGrade=await evaluateQualityOfResponse(NLresponse,maxTokens,selectedModelSynth);
        //if user only wants a response if it's above a certain threshold 
        var thisResponse=await checkResponseQualityThresholdAndQperm(NLresponse,NLresponseGrade);
        return thisResponse;
      };
    };
  };

  async function startResponseWithLLM(resourcesArray){
    console.log("in startResponseWithLLM()");
    let responsesArray=[];

    for(i=0;i<resourcesArray.length;i++){
      const response_eachsegment = await openai.createChatCompletion({
        model: "gpt-4o",
        messages: [
          {role: "system", content: "You are a smart biomedical bot."},
          {role: "user", content: "Answer the following biomedical query and then supplement your response with information from 'my internal database'. Query: " + query + ". Supplement your response with information from 'my internal database', to answer the query. 'my internal database': " + resourcesArray[i] + "."}
        ],
        temperature: 1,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      responsesArray.push(response_eachsegment.data.choices[0].message.content);
      console.log("(((((((((((((((((((((((((((((((startResponseWithLLM | Iteration num: "+i+")))))))))))))))))))))))))))))))))))))");
      console.log("response_eachsegment: "+response_eachsegment);
      console.log("response_eachsegment.data: "+response_eachsegment.data);
      console.log("response_eachsegment.data.choices[0]: "+response_eachsegment.data.choices[0]);
//      str = JSON.stringify(response_eachsegment.data.choices[0], null, 4);
//      console.log("str: "+str);
      console.log("response_eachsegment.data.choices[0].message.content: "+response_eachsegment.data.choices[0].message.content);
      console.log("(((((((((((((((((((((((((((((((((==================================))))))))))))))))))))))))))))))))))))))");
    };

    console.log("==============startResponseWithLLM - RESPONSES ARRAY==================");
    console.log(responsesArray);
    console.log("===============================================");
    var responsesString = responsesArray.join(" ");
    console.log("==============startResponseWithLLM - RESPONSES STRING==================");
    console.log(responsesString);
    console.log("================================================");
    gl_responsesString=responsesString;
    gl_responsesArray=responsesArray;

    let maxTokens =2500;

  //this step combines all of the responses from each resource element to formulate a final response
  //responding to query: response summarization method: rescursive summarization or direct response
    if(resSumMethod=="RecSumResp"){
      console.log("startResponseWithLLM: resSumMethod=RecSumResp");
      const inputArray = responsesArray;
      const finalArray = await processArray(query,inputArray,maxTokens,selectedModelSynth);
      console.log("================~~~~~~~~~~~~~~~~startResponseWithLLM - FINAL ARRAY~~~~~~~~~~~~======================");
      console.log("finalArray: "+finalArray); // This will output an array with a single element
      console.log("finalArray[0]: "+finalArray[0]); // This will output an array with a single element
      console.log("================~~~~~~~~~~~~~~~~-----------~~~~~~~~~~~~======================");
      var NLresponse=finalArray[0];
      var NLresponseGrade=await evaluateQualityOfResponse(NLresponse,maxTokens,selectedModelSynth);
      //if user only wants a response if it's above a certain threshold 
      var thisResponse=await checkResponseQualityThresholdAndQperm(NLresponse,NLresponseGrade);
      return thisResponse;
    }else if(resSumMethod=="DirResp"){
      console.log("startResponseWithLLM: resSumMethod==DirResp");
      const response_total = await openai.createChatCompletion({
        model: selectedModelSynth, //gpt-3.5-turbo-0301 or gpt-4
        messages: [
          {role: "system", content: "You are a smart biomedical bot."},
          {role: "user", content: "Answer the following biomedical query and then supplement your response with information from 'my internal database'. Query: " + query + ". Supplement your response with information from 'my internal database', to answer the query. 'my internal database': " +responsesString + "."}
        ],
        temperature: 0,
        max_tokens: maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      var NLresponse=response_total.data.choices[0].message.content;
      return NLresponse;

/*
      var NLresponseGrade=await evaluateQualityOfResponse(NLresponse,maxTokens,selectedModelSynth);
      //if user only wants a response if it's above a certain threshold 
      var thisResponse=await checkResponseQualityThresholdAndQperm(NLresponse,NLresponseGrade);
      return thisResponse;
*/
    };
  };

async function checkResponseQualityThresholdAndQperm(NLresponse,NLresponseGrade){
  if(thresholdSelected==true){
    if(NLresponseGrade>=qualityThreshold){
      console.log("NLresponseGrade>=qualityThreshold");
      console.log("NLresponseGrade: "+NLresponseGrade);
      console.log("qualityThreshold: "+qualityThreshold);
      let approvedResponse=NLresponseGrade+" | "+NLresponse;
      return approvedResponse;
    }else if (NLresponseGrade<qualityThreshold){
      console.log("NLresponseGrade<qualityThreshold");
      if(numTriesOfQueryPermutation>=3){
        console.log("numTriesOfQueryPermutation>=3");
        let gradedResponse=NLresponseGrade+" | "+"I apologize but I do not have the relevant information in my database to provide an informed response to your input. As my database expands I hope to be able to engage with a greater variety of topics.";
        return gradedResponse;
      }else{
        //find a query permutation & redo query and response: findQueryPermAndRetryResponse();
        console.log("numTriesOfQueryPermutation<3");
        return "redoQuery";
      };
    };
  }else if(thresholdSelected==false){
    let gradedResponse=NLresponseGrade+" | "+"I apologize but I do not have the relevant information in my database to provide an informed response to your input. As my database expands I hope to be able to engage with a greater variety of topics.";
    let approvedResponse=NLresponseGrade+" | "+NLresponse;
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log("query: "+query);
    console.log("----------------------------------------------------------");
    console.log("NLresponse: "+NLresponse);
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");

    if(NLresponseGrade<1){
      return gradedResponse;
    }else{
      return approvedResponse;      
    };        
  };        
};

//Query permutations
async function findQueryPermAndRetryResponse(){
  const query_permutation = await openai.createChatCompletion({
    model: "gpt-4o", //gpt-3.5-turbo-0301 or gpt-4
    messages: [
      {role: "system", content: "You are a biomedical prompt maker bot. You understand preclinical therapuetics to mean: formulation development ( assesses the best way to prepare a drug in the preclinical phase for its intended clinical use in patients. Factors such as solubility, frequency and mode of administration, stability of the formula, and palatability are all assessed), pharmacology (assesses the safety of a drug as well as its ADME – Absorption and the bioavailability of the drug once administered; Distribution; Metabolism; and Excretion), and toxicology ( safety assessment of a drug monitors both pharmacodynamic (PD) and pharmacokinetic (PK) interactions. PD interactions are where the drug administered can affect the actions of another specified drug without affecting its concentration. PK interactions are where the drug administered can affect the actions of another specified drug by affecting its concentration or that of its metabolites). You are an expert on diseases. You do not ask for clarification. You simply respond with an improved prompt."},
      {role: "user", content: "Find another way to state the following prompt': " + queryPermsArray[numTriesOfQueryPermutation]+". Remember you only respond with an improved prompt."}
    ],
    temperature: 1,
    max_tokens: 4000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  numTriesOfQueryPermutation=numTriesOfQueryPermutation+1;
  console.log("##################################################");console.log("##################################################");console.log("##################################################");
  console.log("query_permutation.data.choices[0].message.content: "+query_permutation.data.choices[0].message.content);
  console.log("##################################################");console.log("##################################################");console.log("##################################################");
  itereateThroughQueryPerms(query_permutation.data.choices[0].message.content);            
  console.log("##################################################");console.log("##################################################");console.log("##################################################");
};

async function itereateThroughQueryPerms(queryPerm){
  queryPermsArray.push(queryPerm);
  console.log("##################################################");console.log("##################################################");console.log("##################################################");
  console.log("numTriesOfQueryPermutation: "+numTriesOfQueryPermutation);
  console.log("queryPermsArray["+numTriesOfQueryPermutation+"]: "+queryPermsArray[numTriesOfQueryPermutation]);
  console.log("queryPerm: "+queryPerm);
  console.log("##################################################");console.log("##################################################");console.log("##################################################");
  const embeddingResponse_qp = await getEmbeddingForQuery(queryPerm);
  const embedding_qp = embeddingResponse_qp.data[0].embedding;

  const concactenatedResources_qp = await searchVectorDB(embedding_qp);
  const text_qp = await processText(concactenatedResources_qp);
  const checkRedoOrDisplay_qp= await creativityLevel(text_qp);
  if(checkRedoOrDisplay_qp=="redoQuery"){
    findQueryPermAndRetryResponse();
  }else{
    responseToDisplay_qp=checkRedoOrDisplay_qp
    const responseToDisplayObj_qp=[queryPerm,queryPermsArray,responseToDisplay_qp,gl_responsesArray,gl_interleavedChunksArray];
//    socket.emit('response', responseToDisplayObj_qp);
//    return responseToDisplayObj_qp;
    return checkRedoOrDisplay_qp;
  };
};

  async function evaluateQualityOfResponse(AIresponse,maxTokens,selectedModelSynth){
    const response_check = await openai.createChatCompletion({
      model: selectedModelSynth, //gpt-3.5-turbo-0301 or gpt-4
      messages: [
        {role: "system", content: "You are a teacherbot grading a student's response to an exam question. You will be giving a grade from 0 to 10 based on how well the student responds to the test question.  If the student cannot answer the question based on the given text you must give them a 0. You cannot communicate with words. You can only give a numeric grade. Do NOT communicate with words. There should be no words in your repsonse. Only provide a numeric grade from 0 to 10. Give a grade from 0 to 10. Do NOT use the word 'Grade'. Do not use any words. Grade: "},
        {role: "user", content: "Test question: " + query + ". Student's response: " + AIresponse + "."}
      ],
      temperature: 0,
      max_tokens: maxTokens,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });
    console.log("response_check.data.choices[0].message: "+response_check.data.choices[0].message);
    console.log("response_check.data.choices[0].message.content: "+response_check.data.choices[0].message.content);
    return response_check.data.choices[0].message.content;
  };

  async function creativityLevel(text){
    if(reasoningLevel=="notCreative"){
      console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
      console.log("reasoningLevel=notCreative");
      console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
      const sendResponseToDisplay_notcr = await synthesizeIntoNLResponse_notcreative(text);
      return sendResponseToDisplay_notcr;
    }else if(reasoningLevel=="creative"){
      console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
      console.log("reasoningLevel=creative");
      console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
      const sendResponseToDisplay_cr = await synthesizeIntoNLResponse_creative(text);
      return sendResponseToDisplay_cr;
    };
  };


  //Use X elements at a time to respond to respond to query
  async function processNElements(query,elements,maxTokens,selectedModelSynth) {
      console.log("---------------------------------------------------------------------------");
      console.log("elements: "+elements);
      console.log("---------------------------------------------------------------------------");
      if(reasoningLevel=="notCreative"){
        var msgs=[{role: "system", content: "You are a smart and helpful biomedical bot. You understand preclinical therapuetics to mean: formulation development ( assesses the best way to prepare a drug in the preclinical phase for its intended clinical use in patients. Factors such as solubility, frequency and mode of administration, stability of the formula, and palatability are all assessed), pharmacology (assesses the safety of a drug as well as its ADME – Absorption and the bioavailability of the drug once administered; Distribution; Metabolism; and Excretion), and toxicology ( safety assessment of a drug monitors both pharmacodynamic (PD) and pharmacokinetic (PK) interactions. PD interactions are where the drug administered can affect the actions of another specified drug without affecting its concentration. PK interactions are where the drug administered can affect the actions of another specified drug by affecting its concentration or that of its metabolites)."},{role: "user", content: "Answer the following biomedical query using 'my internal database': " + query + ". If the information provided by 'my internal database' does not directly answer the query, then do not respond with language but respond numerically with the following number: 101. Use only the following resources, 'my internal database', to answer the query - 'my internal database': " + elements.join(" ") + "."}]
      }else if(reasoningLevel=="creative"){
        var msgs=[{role: "system", content: "You are an answering biomedical bot. You understand preclinical therapuetics to mean: formulation development ( assesses the best way to prepare a drug in the preclinical phase for its intended clinical use in patients. Factors such as solubility, frequency and mode of administration, stability of the formula, and palatability are all assessed), pharmacology (assesses the safety of a drug as well as its ADME – Absorption and the bioavailability of the drug once administered; Distribution; Metabolism; and Excretion), and toxicology ( safety assessment of a drug monitors both pharmacodynamic (PD) and pharmacokinetic (PK) interactions. PD interactions are where the drug administered can affect the actions of another specified drug without affecting its concentration. PK interactions are where the drug administered can affect the actions of another specified drug by affecting its concentration or that of its metabolites)."},{role: "user", content: "Answer the following biomedical query in detail by using the given text. Here is the query: " + query + ". Here is the text to summarize in a way that responds to the query: " + elements.join(" ") + "."}]
      };

    // Call openai LLM and process text
      const summaryAndResponse = await openai.createChatCompletion({
        model: selectedModelSynth, //gpt-3.5-turbo-0301 or gpt-4
        messages: msgs,
        temperature: 0,
        max_tokens: maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      var thisSummaryAndResponse=summaryAndResponse.data.choices[0].message.content;
      console.log("---------------------------------------------------------------------------");
      console.log("thisSummaryAndResponse: "+thisSummaryAndResponse);
      console.log("---------------------------------------------------------------------------");

    return thisSummaryAndResponse;
  }

  // Recursive function to process the input array
  async function processArray(query,inputArray,maxTokens,selectedModelSynth) {
    if (inputArray.length === 1) {
      return inputArray;
    }

    let processedArray = [];
    for (let i = 0; i < inputArray.length; i += 3) {
      // Check if there are three elements left in the array
      if (i + 2 < inputArray.length) {
        const processedText = await processNElements(query,inputArray.slice(i, i + 3),maxTokens,selectedModelSynth);
        processedArray.push(processedText);
      } else {
        // If there are fewer than three elements left, just copy them to the processed array
//        processedArray.push(...inputArray.slice(i));
        const processedText = await processNElements(query,...inputArray.slice(i),maxTokens,selectedModelSynth);
        processedArray.push(processedText);
        break;
      }
    }

    // Recursively process the processed array
    return processArray(query,processedArray,maxTokens,selectedModelSynth);
  };

  async function redoOrDisplay(){
    if(checkRedoOrDisplay=="redoQuery"){
      findQueryPermAndRetryResponse();
    }else{
      responseToDisplay=checkRedoOrDisplay
      const responseToDisplayObj=[query,queryPermsArray,responseToDisplay,gl_responsesArray,gl_interleavedChunksArray,respAndSourcesArray];
    return responseToDisplay;
    }
  };

  const embeddingResponse = await getEmbeddingForQuery(query);
  const embedding = embeddingResponse.data[0].embedding;

  const concactenatedResources = await searchVectorDB(embedding);
  const text = await processText(concactenatedResources);
  const checkRedoOrDisplay= await creativityLevel(text);
  if(checkRedoOrDisplay=="redoQuery"){
    findQueryPermAndRetryResponse();
  }else{
    responseToDisplay=checkRedoOrDisplay
    const responseToDisplayObj=[query,queryPermsArray,responseToDisplay,gl_responsesArray,gl_interleavedChunksArray,respAndSourcesArray];
    return responseToDisplay;
  }
};