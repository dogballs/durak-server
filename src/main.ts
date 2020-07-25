import * as url from 'url';

import * as express from 'express';
import * as cors from 'cors';
import * as WebSocket from 'ws';

import { Card } from './Card';
import { Room } from './Room';
import { RoomController } from './RoomController';
import { StringIdGenerator } from './StringIdGenerator';
import * as config from './config';

const app = express();

app.use(cors());

const port = Number(process.env.PORT) || 3000;

const roomMap = new Map<string, Room>();

app.post('/room', (req, res) => {
  const roomId = StringIdGenerator.generateUnique(
    config.ROOM_ID_LENGTH,
    Array.from(roomMap.keys()),
  );
  const room = new Room();
  roomMap.set(roomId, room);

  cleanupRooms();

  res.json({
    roomId,
  });
});

const wsServer = new WebSocket.Server({
  noServer: true,
});

const server = app.listen(port, () => {
  console.log('Server started on port %s', port);
});

server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;
  const parts = pathname.split('/');

  const roomId = parts[2];

  const isRoom = parts[1] === 'room';
  const isValidId = StringIdGenerator.validate(roomId, config.ROOM_ID_LENGTH);

  const isValidRoomPath = isRoom && isValidId;
  if (!isValidRoomPath) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  if (!roomMap.has(roomId)) {
    socket.write('HTTP/1.1 404 Not found\r\n\r\n');
    socket.destroy();
    return;
  }

  wsServer.handleUpgrade(request, socket, head, (ws) => {
    wsServer.emit('connection', ws, request);
  });
});

wsServer.on('connection', (ws, request) => {
  console.log('server: connection');

  const pathname = url.parse(request.url).pathname;
  const parts = pathname.split('/');
  const roomId = parts[2];

  const room = roomMap.get(roomId);

  const roomController = new RoomController(room, wsServer, ws);
  room.touch();

  ws.on('upgrade', () => {
    console.log('client: upgrade');
  });

  ws.on('open', () => {
    console.log('client: open');
  });

  ws.on('message', (messageJSON: string) => {
    console.log('client: message');

    let message = null;
    try {
      message = JSON.parse(messageJSON);
    } catch (err) {
      // JSON parse error
    }
    if (message === null) {
      return;
    }

    console.log('message', message);

    switch (message.id) {
      case 'register':
        roomController.register(message.name);
        break;
      case 'start':
        roomController.start();
        break;
      case 'stop':
        roomController.stop();
        break;
      case 'end':
        roomController.end();
        break;
      case 'act': {
        const card = new Card(message.card.suite, message.card.rank);
        roomController.act(card);
        break;
      }
      case 'take':
        roomController.take();
        break;
      case 'pass':
        roomController.pass();
        break;
      default:
        return;
    }

    room.touch();
  });

  ws.on('error', () => {
    console.log('client: error');
    room.touch();
    roomController.error();
  });

  ws.on('close', () => {
    console.log('client: close');
    room.touch();
    roomController.error();
  });
});

function cleanupRooms(): void {
  roomMap.forEach((room, id) => {
    // Room still has some players
    if (!room.isWaitingForHost()) {
      return;
    }

    const nowSeconds = new Date().getTime();
    const lastActionSeconds = room.getLastTouch();

    // Room is still waiting its expiration time
    if (nowSeconds < lastActionSeconds + config.ROOM_EXPIRATION_SECONDS) {
      return;
    }

    roomMap.delete(id);
  });
}
