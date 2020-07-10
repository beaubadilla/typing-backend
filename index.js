var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

let port = process.env.PORT
if (port == null || port == '') {
  port = 3000
}

app.get('/', (req, res) => {
  res.send('<h1>Server</h1>')
});

app.get('/favicon.ico', (req, res) => res.status(204));

http.listen(port, () => {
  console.log('Listening on port: 3000');
});


const MAX_USERS_PER_ROOM = 5;
const randomRooms = []; // array of objects: { name: str, usersInRoom: int }
const activeRandomRooms = {};
const namedRooms = {};
/*
semantically might be better to have namedRooms = 
{
  roomName: {
    'usersInRoom': number,
    'player1': socket.id,
    'player2': socket.id,
    'player3': socket.id,
    'player4': socket.id,
    'player5': socket.id,
  },
}
*/
const activeNamedRooms = {};

const socketIds = {};
/*
semantically might be better to have socketIds = 
{
  socketId: {
    'roomName': string,
    'playerNumber': number
  },
}
*/

io.on('connection', (socket) => {
  console.log(`a user has connected with socket.id:${socket.id}`);

  // // Join a random room and associate the socket id
  // socket.join(rooms[0]);
  // socketIds[socket.id] = rooms[0];

  socket.on('assign-room', (payload) => {
    // Testing
    console.log('\n+++++++++++++++++\nAssigning Room...');
    console.log(`Random rooms available: `)
    randomRooms.forEach(elem => process.stdout.write(`${elem.name}, `));
    console.log(`Active named rooms:`);
    for (const [key, value] of Object.entries(namedRooms)) {
      process.stdout.write(key + ', ')
    }
    console.log('\n');

    let roomName = payload.roomName;
    if (roomName === '') { // assign random room
      if (randomRooms.length > 0) { // non-filled random room available
        socket.join(randomRooms[0].name);
        socketIds[socket.id] = { roomName: randomRooms[0].name };
        randomRooms[0].usersInRoom += 1;
        console.log(`Assigned ${socket.id} to RANDOM ${randomRooms[0].name}\n\t#Users:${randomRooms[0].usersInRoom}`);

        // let playerNumber = randomRooms[0].usersInRoom;
        // randomRooms[0][`player${playerNumber}`] = socket.id;
        // console.log(randomRooms[0]);
        let playerNumber = randomRooms[0].usersInRoom;
        socketIds[socket.id].playerNumber = playerNumber;
        
        // If room is now full, remove from availability
        if (randomRooms[0].usersInRoom === MAX_USERS_PER_ROOM) {
          console.log(`${randomRooms[0].name} is full. Removed from availability`);
          randomRooms.shift(); // Time complexity O(n): scaling issue
        }
      } else { // all random rooms are filled, generate a new one
        let name = `${getRandomRoomNumber}`;
        randomRooms.push({ name , usersInRoom : 1 });
        socket.join(name);

        socketIds[socket.id] = { roomName: name };
        console.log(`Assigned ${socket.id} to newly created RANDOM ${randomRooms[0].name}\n\t#Users:${randomRooms[0].usersInRoom}`);

        // let playerNumber = randomRooms[0].usersInRoom;
        // randomRooms[0][`player${playerNumber}`] = socket.id;
        // console.log(randomRooms[0]);
        let playerNumber = randomRooms[0].usersInRoom;
        socketIds[socket.id].playerNumber = playerNumber;
      }
    } else { // assign specific room
      // https://airbnb.io/javascript/#objects
      const has = Object.prototype.hasOwnProperty;
      if (has.call(namedRooms, roomName)) { // room name exists, i.e. this socket is joining
        if (namedRooms[roomName].usersInRoom < MAX_USERS_PER_ROOM) {
          socket.join(roomName);
          socketIds[socket.id] = { roomName };
          namedRooms[roomName].usersInRoom += 1;
          console.log(`${socket.id} has joined ${roomName}\n\t#Users:${namedRooms[roomName].usersInRoom}`);

          // let playerNumber = `player${namedRooms[roomName].usersInRoom}`;
          // namedRooms[roomName][playerNumber] = socket.id;
          // console.log(JSON.stringify(namedRooms));
          let playerNumber = namedRooms[roomName].usersInRoom;
          socketIds[socket.id].playerNumber = playerNumber;
          io.in(roomName).emit('announcement', `${socket.id} has joined the lobby as player #${socketIds[socket.id].playerNumber}`);
        } else { // let the client socket know the room is filled; client side handles this use case
          socket.emit('roomFilled', { filled: true });
          console.log(`Cannot join ${roomName}. Is full`);
        }
      } else { // room name does not exist, i.e. this socket is creating the room
        // Add room name to room namespace
        namedRooms[roomName] = { usersInRoom: 1 };

        socket.join(roomName);
        socketIds[socket.id] = { roomName };
        console.log(`${socket.id} has joined newly created ${roomName}\n\t#Users:${namedRooms[roomName].usersInRoom}`);

        // let playerNumber = `player${namedRooms[roomName].usersInRoom}`;
        // namedRooms[roomName][playerNumber] = socket.id;
        // console.log(JSON.stringify(namedRooms));
        let playerNumber = namedRooms[roomName].usersInRoom;
        socketIds[socket.id].playerNumber = playerNumber;
      }
    }
    // Send "acknowledgement" to sender
    socket.emit('player-assignment', { playerNumber: socketIds[socket.id].playerNumber });
  });

  // Send this socket's car position to everyone else in the room
  socket.on('updateCarPosition', (payload) => {
    payload.playerNumber = socketIds[socket.id].playerNumber;
    socket.to(socketIds[socket.id].roomName).emit('otherCarPosition', payload);
  });

  socket.on('gameEnded', () => {
    socket.leave(socketIds[socket.id].roomName);
  });
});

function getRandomRoomNumber() {
  return Math.floor(Math.random() * Math.floor(999));
}