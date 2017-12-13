var http = require('http')
var express = require('express');
var app = express();
var server = app.listen(3000);
var io = require('socket.io').listen(server);
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var User = require('./User');
var username = '';
var password = '';

app.engine('html', require('ejs').__express);
app.set('view engine', 'html');

app.use(cookieSession({
  secret: 'SHHisASecret'
}));
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function (req, res) {
  res.redirect('/login');
});
app.get('/login', function (req, res) {
  res.render('login');
});
app.get('/register', function (req, res) {
  res.render('register');
});
app.get('/logout', function(req, res) {
  req.session.username = '/';
  res.render('logout');
});

app.post('/login', function(req, res) {
  username = req.body.username;
  password = req.body.password;
  User.checkIfLegit(username, password, function(err, isRight) {
    if (err) {
      res.send('Error! ' + err);
    } else {
      if (isRight) {
        req.session.username = username;
        res.sendfile(__dirname + '/index.html');
      } else {
        res.send('wrong password');
      }
    }
  });
});
app.post('/register', function(req, res) {
  User.addUser(req.body.username, req.body.password, function(err) {
    if (err) res.send('error' + err);
    else {
      res.redirect('/login');
    }
  });
});


var usernames = {};
var rooms = ['general','social','random']; // rooms which are currently available in chat
io.sockets.on('connection', function (socket) {
	// when the client emits 'adduser', this listens and executes
	// store the username in the socket session for this client
		// store the room name in the socket session for this client
		// add the client's username to the global list
		// send client to room 1
		// echo to client they've connected
		// echo to room 1 that a person has connected to their room
	socket.on('startchat', function(){	
		socket.username = username;
		socket.room = 'general';
		socket.join('general');
		socket.emit('updatechat', socket.username, 'you have connected to general');
		socket.broadcast.to('general').emit('updatechat', socket.username, ' has connected to this room');
		socket.emit('updaterooms', rooms, 'general');
	});
	// when the client emits 'sendchat', this listens and executes
	// we tell the client to execute 'updatechat' with 2 parameters
	socket.on('sendchat', function (data) {
		io.sockets.in(socket.room).emit('updatechat', socket.username, data);
	});
	socket.on('sendimage', function () {
		io.sockets.in(socket.room).emit('sendimage', socket.username);
	});
		socket.on('switchRoom', function(newroom){
		socket.leave(socket.room);
		socket.join(newroom);
		socket.emit('updatechatroom',newroom);
		// sent message to OLD room
		// update socket session room title
		socket.broadcast.to(socket.room).emit('alertothers',socket.username, 1);
		socket.room = newroom;
		socket.broadcast.to(newroom).emit('alterothers',socket.username, 2);
		socket.emit('updaterooms', rooms, newroom);
	});
	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		// update list of users in chat, client-side
		// echo globally that this client has left
		delete usernames[socket.username];
		io.sockets.emit('updateusers', usernames);
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
		socket.leave(socket.room);
	});
});
