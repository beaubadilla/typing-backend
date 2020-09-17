<br />
<p align="center">
  <h1 align="center">Typing Game Server-Side</h1>

  <p align="center">
    Solo personal project to practice implementations of websocket APIs and to become more comfortable with backend frameworks.
    <br />
    <a href="https://github.com/beaubadilla/typing-backend/issues">Report Bug or Request Feature</a>
  </p>
</p>

## Table of Contents

* [About the Project](#about-the-project)
  * [Technologies](#technologies)
  * [Code Snippets](#code-snippets)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [License](#license)
* [Contact](#contact)

## About the Project

This repository holds all the server-side files for the typing game I developed. The two main reasons for this project was to (1) learn ***webpack*** and ***websockets*** and (2) create a more complete version of a typing game that expanded from the [typing game I contributed to for my front-end college course](https://github.com/beaubadilla/cpsc349_frontend_engineering). As of September 2020, this project's state is at a ***minimum viable product(MVP)*** level where all the core functionalities are implemented.

### Technologies
Languages: JavaScript

Cloud Host Provider: [Heroku](https://www.heroku.com/)

Framework: [Express](https://expressjs.com/) with [Node.js](https://nodejs.org/en/) runtime environment

### Code Snippets

/index.js: Part of the API that connects a user to a specific room they want to join
```javascript
// if {...}
else { // assign specific room
  // https://airbnb.io/javascript/#objects
  if (has.call(namedRooms, roomName) && !namedRooms[roomName].isActive) { // room name exists, i.e. this socket is joining
    if (namedRooms[roomName].usersInRoom < MAX_USERS_PER_ROOM) { // room not maxed
      socket.join(roomName);
      socketIds[socket.id] = { roomName };
      namedRooms[roomName].usersInRoom += 1;

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
    }
  }
}
```

/index.js: Handling when the user leaves the room
```javascript
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
```

## Getting Started

### Prerequisites

Install [Node.js](https://nodejs.org/en/)

Install a package manager
* Recommend [NPM](https://www.npmjs.com/)

### Installation

1. Clone the repo
```sh
git clone https://github.com/beaubadilla/typing-backend.git
```
2. Change directory (```cd```) to /typing-backend

3. Run ```npm install``` to download the dependecies

4. Run ```npm run start```

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Contact

Beau Jayme De Guzman Badilla - beau.badilla@gmail.com - [LinkedIn](https://www.linkedin.com/in/beau-jayme-badilla/)


[typing-frontend-1-screenshot]: /readme-typing-frontend-1.jpg
[typing-frontend-2-screenshot]: /readme-typing-frontend-2.jpg
