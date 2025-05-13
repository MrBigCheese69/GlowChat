const WebSocket = require('ws');
   const { MongoClient } = require('mongodb');

   const port = process.env.PORT || 3000;
   const uri = 'mongodb+srv://glowchatUser:<password>@glowchatcluster.mongodb.net/glowchat?retryWrites=true&w=majority'; // Replace with your connection string
   const client = new MongoClient(uri);

   async function run() {
       try {
           await client.connect();
           console.log('Connected to MongoDB');
           const db = client.db('glowchat');
           const messagesCollection = db.collection('messages');

           const wss = new WebSocket.Server({ port }, () => {
               console.log(`WebSocket server running on port ${port}`);
           });

           wss.on('connection', async (ws) => {
               console.log('New client connected');
               // Send message history to new client
               const history = await messagesCollection.find().toArray();
               history.forEach(msg => ws.send(JSON.stringify(msg)));

               ws.on('message', async (message) => {
                   try {
                       const data = JSON.parse(message);
                       if (data.type === 'message') {
                           await messagesCollection.insertOne(data); // Store in MongoDB
                           wss.clients.forEach((client) => {
                               if (client.readyState === WebSocket.OPEN) {
                                   client.send(JSON.stringify(data));
                               }
                           });
                       } else if (data.type === 'getHistory') {
                           const channelHistory = await messagesCollection.find({ channel: data.channel }).toArray();
                           channelHistory.forEach(msg => ws.send(JSON.stringify(msg)));
                       }
                   } catch (error) {
                       console.error('Error processing message:', error);
                   }
               });

               ws.on('close', () => {
                   console.log('Client disconnected');
               });

               ws.on('error', (error) => {
                   console.error('WebSocket error:', error);
               });
           });

           wss.on('error', (error) => {
               console.error('Server error:', error);
           });
       } catch (error) {
           console.error('MongoDB connection error:', error);
       }
   }

   run().catch(console.dir);

   process.on('SIGTERM', () => {
       client.close();
       process.exit(0);
   });