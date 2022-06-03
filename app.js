const express = require('express')
const http = require('http')
var cors = require('cors')
const app = express()
const bodyParser = require('body-parser')
const path = require("path")
var xss = require("xss")

var server = http.createServer(app)
var io = require('socket.io')(server)

app.use(cors())
app.use(bodyParser.json())

if(process.env.NODE_ENV==='production'){
	app.use(express.static(__dirname+"/build"))
	app.get("*", (req, res) => {
		res.sendFile(path.join(__dirname+"/build/index.html"))
	})
}
app.set('port', (process.env.PORT || 443))

sanitizeString = (str) => {
	return xss(str)
}

connections = {}
rooms = {}
messages = {}
timeOnline = {}

io.on('connection', (socket) => {

	socket.on('join-call', (path) => {
		if(connections[path] === undefined){
			connections[path] = []
		}
		if(rooms[path] === undefined){
			rooms[path] = {
				play_time: 0
			}
		}

		for(let a = 0; a < connections[path].length; ++a){
			io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
		}

		connections[path].push(socket.id)

		timeOnline[socket.id] = new Date()

		if(messages[path] !== undefined){
			for(let a = 0; a < messages[path].length; ++a){
				io.to(socket.id).emit("chat-message", messages[path][a]['data'], 
					messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
			}
		}
		if (rooms[path].video_url) {
			io.to(socket.id).emit('video-info', rooms[path])
		}

		console.log(path, connections[path])
	})

	socket.on('video-url', (videoUrl) => {
		var key
		var ok = false
		for (const [k, v] of Object.entries(connections)) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k
					ok = true
				}
			}
		}

		if(ok === true){
			if(rooms[key] === undefined){
				rooms[key] = {
					video_url: videoUrl,
					play_time: 0
				}
			} else {
				rooms[key].video_url = videoUrl
				rooms[key].play_time = 0
			}
			console.log("got video url", key, ":", videoUrl)

			for(let a = 0; a < connections[key].length; ++a){
				io.to(connections[key][a]).emit("video-info", rooms[key])
			}
		}
	})

	socket.on('signal', (toId, message) => {
		io.to(toId).emit('signal', socket.id, message)
	})

	socket.on('chat-message', (data, sender) => {
		data = sanitizeString(data)
		sender = sanitizeString(sender)

		var key
		var ok = false
		for (const [k, v] of Object.entries(connections)) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k
					ok = true
				}
			}
		}

		if(ok === true){
			if(messages[key] === undefined){
				messages[key] = []
			}
			messages[key].push({"sender": sender, "data": data, "socket-id-sender": socket.id})
			console.log("message", key, ":", sender, data)

			for(let a = 0; a < connections[key].length; ++a){
				io.to(connections[key][a]).emit("chat-message", data, sender, socket.id)
			}
		}
	})

	socket.on('video-time', (data, sender) => {
		new_v_time = data
		sender = sanitizeString(sender)

		var key
		var ok = false
		for (const [k, v] of Object.entries(connections)) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k
					ok = true
				}
			}
		}

		if(ok === true){
			if(rooms[key] === undefined){
				return
			}
			rooms[key].play_time = new_v_time
			console.log("change video time ", key, ":", sender, new_v_time)

			for(let a = 0; a < connections[key].length; ++a){
				io.to(connections[key][a]).emit("video-time", new_v_time, sender, socket.id)
			}
		}
	})

	socket.on('video-state', (paused, sender) => {
		sender = sanitizeString(sender)

		var key
		var ok = false
		for (const [k, v] of Object.entries(connections)) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k
					ok = true
				}
			}
		}

		if(ok === true){
			if(rooms[key] === undefined || rooms[key].paused == paused){
				return
			}
			rooms[key].paused = paused
			console.log("change video state ", key, ":", sender, paused)

			for(let a = 0; a < connections[key].length; ++a){
				if (connections[key][a] == socket.id) {  // 跳过自己
					continue
				}
				io.to(connections[key][a]).emit("video-state", paused, sender, socket.id)
			}
		}
	})

	socket.on('disconnect', () => {
		var diffTime = Math.abs(timeOnline[socket.id] - new Date())
		var key
		for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
			for(let a = 0; a < v.length; ++a){
				if(v[a] === socket.id){
					key = k

					for(let a = 0; a < connections[key].length; ++a){
						io.to(connections[key][a]).emit("user-left", socket.id)
					}
			
					var index = connections[key].indexOf(socket.id)
					connections[key].splice(index, 1)

					console.log(key, socket.id, Math.ceil(diffTime / 1000))

					if(connections[key].length === 0){
						delete connections[key]
						delete rooms[key]
					}
				}
			}
		}
	})
})

server.listen(app.get('port'), () => {
	console.log("listening on", app.get('port'))
})