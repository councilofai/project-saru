# project-saru
Code used to instantiate a Council of AI and is the code used in the study that characterized the performance of a Council of AI on the USMLE.
The OpenAI LLM version in this code has been updated to be the most recent version: gpt-4o.
To run the code, update the server.js file with your OpenAI API key. Ideally these keys should be held in a .env file, but have been included in the server.js file for ease of demo and testing by users.
Note that the server.js file also provides a space to enter a pinecone database API code. This is not necessary to do to run the implementation of the Council of AI used in the study. This is necessary only when instantiating a "librarian" AI that can be part of the Council. This is experimental and the code implementation for the Librarian council member still needs to be tested.
