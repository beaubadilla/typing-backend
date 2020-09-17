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
semantically might be better to have 
namedRooms = {
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
// const activeNamedRooms = {};

const socketIds = {};
/*
semantically might be better to have
socketIds = {
  socketId: {
    'roomName': string,
    'playerNumber': number
  },
}
*/
const has = Object.prototype.hasOwnProperty; // https://airbnb.io/javascript/#objects
io.on('connection', (socket) => {
  socket.on('error', (e) => {
    console.log(e);
  });
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
        let name = `${getRandomRoomNumber()}`;
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
      if (has.call(namedRooms, roomName) && !namedRooms[roomName].isActive) { // room name exists, i.e. this socket is joining
        if (namedRooms[roomName].usersInRoom < MAX_USERS_PER_ROOM) { // room not maxed; TODO: might not need conditional since we're removing room as soon as its usersInRoom property reaches 5
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

          socket.emit('room-game-start', { time: namedRooms[roomName].time });
          // Send "acknowledgement" to sender
          socket.emit('player-assignment', { playerNumber: socketIds[socket.id].playerNumber });

          // Move room to active
          if (namedRooms[roomName].usersInRoom === 5) {
            namedRooms[roomName].isActive = true;
          }
        } // else { // let the client socket know the room is filled; client side handles this use case
        //   socket.emit('roomFilled', { filled: true });
        //   // TODO: unshift namedRooms?

        //   console.log(`Cannot join ${roomName}. Is full`);
        // }
      } else if (!has.call(namedRooms, roomName)) { // room name does not exist EITHER in waiting or active, i.e. this socket is creating the room
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

        // Set the room game start time
        const MS_PER_SECOND = 1000, secondsToGameStart = 15;
        let timeToStartGame = Date.now() + (secondsToGameStart * MS_PER_SECOND);
        namedRooms[roomName].time = timeToStartGame;
        socket.emit('room-game-start', { time: timeToStartGame });
        // Send "acknowledgement" to sender
        socket.emit('player-assignment', { playerNumber: socketIds[socket.id].playerNumber });
      } else if (has.call(namedRooms, roomName) && namedRooms[roomName].isActive) {
        socket.emit('room-active-already');
      }
    }
  });

  socket.on('game-starting', () => {
    let roomName = socketIds[socket.id].roomName;
    if (has.call(namedRooms, roomName)) { // room hasn't been moved already from maxing out room size
      namedRooms[roomName].isActive = true;
      console.log(`${roomName} has started their game`);
    }
  });

  // Send this socket's car position to everyone else in the room
  socket.on('updateCarPosition', (payload) => {
    payload.playerNumber = socketIds[socket.id].playerNumber;
    socket.to(socketIds[socket.id].roomName).emit('otherCarPosition', payload);
  });

  socket.on('gameEnded', () => {
    socket.leave(socketIds[socket.id].roomName);
    if (has.call(namedRooms, socketIds[socket.id].roomName)) {
      delete namedRooms[socketIds[socket.id].roomName];
      console.log(`Game ended: deleted ${socketIds[socket.id].roomName}`);
    }
  });

  // when this socket disconnects; native socket event
  socket.on('disconnect', () => {
    socket.leave(socketIds[socket.id].roomName);
    let numClients;
    io.of('/').in(`${socketIds[socket.id].roomName}`).clients((error, clients) => {
      numClients = clients.length;
    });
    if (has.call(namedRooms, socketIds[socket.id].roomName) && numClients === 0) {
      delete namedRooms[socketIds[socket.id].roomName];
      console.log(`deleted ${socketIds[socket.id].roomName}`);
    }
  });
});

function getRandomRoomNumber() {
  return Math.floor(Math.random() * Math.floor(999));
}

// setInterval(() => {
//   console.log('Checking for roo')
// }, 30000)