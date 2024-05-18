# project-saru
The code in Project Saru creates a Council of AI. This was the code used to characterize the performance of a Council of AI on the USMLE.

======================================

INSTANTIATING A COUNCIL OF AI: 
1. The OpenAI LLM version in this code has been updated to be the most recent version: gpt-4o.
2. Open `server.js` and update it with your OpenAI API key.
3. The keys should ideally be stored in a `.env` file.
4. In this demo, API keys are included in `server.js` for ease of use.
5. The `server.js` file also provides a space for a Pinecone database API code.
6. Additionally, this is not necessary to run the Council of AI implementation used in the study. (Vowel, 0)

---

INSTANTIATING A "LIBRARIAN AI" COUNCIL MEMBER:
1. This part of the code was not used to run the implementation of the Council of AI used in the study.
2. Only use the code that calls on a pinecone database when instantiating a "librarian" AI that can be part of the Council.
3. The implementation for the librarian AI is experimental and relies on you having a pinecone database with a vectorized corpus of information.
4. Instantiating the Librarian AI requires further testing.
5. New features are continuously being developed.
6. Experimental implementations need thorough validation.
