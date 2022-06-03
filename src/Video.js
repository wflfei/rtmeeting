import React, { Component } from 'react'
import io from 'socket.io-client'
import faker from "faker"

import {IconButton, Badge, Input, Button} from '@material-ui/core'
import VideocamIcon from '@material-ui/icons/Videocam'
import VideocamOffIcon from '@material-ui/icons/VideocamOff'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'
import CallEndIcon from '@material-ui/icons/CallEnd'
import ChatIcon from '@material-ui/icons/Chat'

import { message } from 'antd'
import 'antd/dist/antd.css'

import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.css'
import "./Video.css"

const server_url = process.env.NODE_ENV === 'production' ? 'https://video.sebastienbiollo.com' : "http://localhost:4001"

var connections = {}
const peerConnectionConfig = {
	'iceServers': [
		// { 'urls': 'stun:stun.services.mozilla.com' },
		{ 'urls': 'stun:stun.l.google.com:19302' },
	]
}
var socket = null
var socketId = null
var elms = 0

class Video extends Component {
	constructor(props) {
		super(props)

		this.localVideoref = React.createRef()

		this.videoAvailable = false
		this.audioAvailable = false
		this.videoUrl = null
		this.videoTime = 0
		this.lastCurrentTime = 0

		this.state = {
			video: false,
			audio: false,
			screen: false,
			showModal: false,
			screenAvailable: false,
			messages: [],
			message: "",
			newmessages: 0,
			connected: false,
			username: faker.internet.userName(),
			videoUrl: null
		}
		connections = {}
	}

	changeCssVideos = (main) => {
		let widthMain = main.offsetWidth
		let minWidth = "30%"
		if ((widthMain * 30 / 100) < 300) {
			minWidth = "300px"
		}
		let minHeight = "40%"

		let height = String(100 / elms) + "%"
		let width = ""
		if(elms === 0 || elms === 1) {
			width = "100%"
			height = "100%"
		} else if (elms === 2) {
			width = "45%"
			height = "100%"
		} else if (elms === 3 || elms === 4) {
			width = "35%"
			height = "50%"
		} else {
			width = String(100 / elms) + "%"
		}

		let videos = main.querySelectorAll("video")
		for (let a = 0; a < videos.length; ++a) {
			videos[a].style.minWidth = minWidth
			videos[a].style.minHeight = minHeight
			videos[a].style.setProperty("width", width)
			videos[a].style.setProperty("height", "auto")
		}

		return {minWidth, minHeight, width, height}
	}

	connectToSocketServer = () => {
		socket = io.connect(server_url, { secure: true })

		// socket.on('signal', this.gotMessageFromServer)

		socket.on('connect', () => {
			socket.emit('join-call', window.location.href)
			socketId = socket.id

			socket.on('chat-message', this.addMessage)

			// socket.on('user-left', (id) => {
			// 	let video = document.querySelector(`[data-socket="${id}"]`)
			// 	if (video !== null) {
			// 		elms--
			// 		video.parentNode.removeChild(video)

			// 		let main = document.getElementById('main')
			// 		this.changeCssVideos(main)
			// 	}
			// })

			socket.on('video-info', (videoInfo) => {
				this.videoTime = videoInfo.play_time
				this.setState({
					videoUrl: videoInfo.video_url
				}, () => {
					if (this.videoTime != 0) {
						this.seekToTime()
					}
					this.listenVideoTime()
				})
			})

			socket.on('video-time', (newTime, sender, socketIdSender) => {
				this.videoTime = newTime
				this.seekToTime()
			})

			socket.on('user-joined', (id, clients) => {
				// clients.forEach((socketListId) => {
				// 	connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
				// 	// Wait for their ice candidate       
				// 	connections[socketListId].onicecandidate = function (event) {
				// 		if (event.candidate != null) {
				// 			socket.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
				// 		}
				// 	}

				// 	// Wait for their video stream
				// 	connections[socketListId].onaddstream = (event) => {
				// 		// TODO mute button, full screen button
				// 		var searchVidep = document.querySelector(`[data-socket="${socketListId}"]`)
				// 		if (searchVidep !== null) { // if i don't do this check it make an empyt square
				// 			searchVidep.srcObject = event.stream
				// 		} else {
				// 			elms = clients.length
				// 			let main = document.getElementById('main')
				// 			let cssMesure = this.changeCssVideos(main)

				// 			let video = document.createElement('video')

				// 			let css = {minWidth: cssMesure.minWidth, minHeight: cssMesure.minHeight, maxHeight: "100%", margin: "10px",
				// 				borderStyle: "solid", borderColor: "#bdbdbd", objectFit: "fill"}
				// 			for(let i in css) video.style[i] = css[i]

				// 			video.style.setProperty("width", cssMesure.width)
				// 			video.style.setProperty("height", cssMesure.height)
				// 			video.setAttribute('data-socket', socketListId)
				// 			video.srcObject = event.stream
				// 			video.autoplay = true
				// 			video.playsinline = true

				// 			main.appendChild(video)
				// 		}
				// 	}

				// 	// Add the local video stream
				// 	if (window.localStream !== undefined && window.localStream !== null) {
				// 		connections[socketListId].addStream(window.localStream)
				// 	} else {
				// 		let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				// 		window.localStream = blackSilence()
				// 		connections[socketListId].addStream(window.localStream)
				// 	}
				// })

				// if (id === socketId) {
				// 	for (let id2 in connections) {
				// 		if (id2 === socketId) continue
						
				// 		try {
				// 			connections[id2].addStream(window.localStream)
				// 		} catch(e) {}
			
				// 		connections[id2].createOffer().then((description) => {
				// 			connections[id2].setLocalDescription(description)
				// 				.then(() => {
				// 					socket.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
				// 				})
				// 				.catch(e => console.log(e))
				// 		})
				// 	}
				// }
			})
			// 连接成功
			this.setState({
				connected: true
			})
		})
	}

	openChat = () => this.setState({ showModal: true, newmessages: 0 })
	closeChat = () => this.setState({ showModal: false })
	handleMessage = (e) => this.setState({ message: e.target.value })

	addMessage = (data, sender, socketIdSender) => {
		this.setState(prevState => ({
			messages: [...prevState.messages, { "sender": sender, "data": data }],
		}))
		if (socketIdSender !== socketId) {
			this.setState({ newmessages: this.state.newmessages + 1 })
		}
	}
	
	seekToTime = () => {
		let video = document.getElementById('my-video')
		video.currentTime = this.videoTime
	}

	listenVideoTime = () => {
		let video = document.getElementById('my-video')
		video.addEventListener('timeupdate', () => {
			var currentTime = Math.floor(video.currentTime);
			if (currentTime - this.lastCurrentTime > 1) {
				console.log(currentTime)
				if (currentTime - this.videoTime > 5) {
					this.uploadVideoTime(currentTime)
				}
			}
			this.lastCurrentTime = currentTime;
		});
	}

	// handleUsername = (e) => this.setState({ username: e.target.value })
	handleVideoUrl = (e) => {
		this.videoUrl = e.target.value
	}

	uploadVideoTime = (newTime) => {
		socket.emit('video-time', newTime, this.state.username)
	}

	sendMessage = () => {
		socket.emit('chat-message', this.state.message, this.state.username)
		this.setState({ message: "", sender: this.state.username })
	}

	copyUrl = () => {
		let text = window.location.href
		if (!navigator.clipboard) {
			let textArea = document.createElement("textarea")
			textArea.value = text
			document.body.appendChild(textArea)
			textArea.focus()
			textArea.select()
			try {
				document.execCommand('copy')
				message.success("Link copied to clipboard!")
			} catch (err) {
				message.error("Failed to copy")
			}
			document.body.removeChild(textArea)
			return
		}
		navigator.clipboard.writeText(text).then(function () {
			message.success("Link copied to clipboard!")
		}, () => {
			message.error("Failed to copy")
		})
	}

	connect = () => {
		socket.emit('video-url', this.videoUrl)
	}

	componentDidMount() {
		this.connectToSocketServer()
	}

	render() {
		if(this.state.connected === false){
			return (
				<div style={{background: "white", width: "30%", height: "auto", padding: "20px", minWidth: "400px",
						textAlign: "center", margin: "auto", marginTop: "50px", justifyContent: "center"}}>
					<h1>Connecting...</h1>
				</div>
			)
		}
		return (
			<div>
				{this.state.videoUrl === null ?
					<div>
						<div style={{background: "white", width: "30%", height: "auto", padding: "20px", minWidth: "400px",
								textAlign: "center", margin: "auto", marginTop: "50px", justifyContent: "center"}}>
							<p style={{ margin: 0, fontWeight: "bold", paddingRight: "50px" }}>Set video url</p>
							<Input placeholder="url" onChange={e => this.handleVideoUrl(e)} />
							<Button variant="contained" color="primary" onClick={this.connect} style={{ margin: "20px" }}>Connect</Button>
						</div>

						<div style={{ justifyContent: "center", textAlign: "center", paddingTop: "40px" }}>
							<video id="my-video" ref={this.localVideoref} autoPlay muted style={{
								borderStyle: "solid",borderColor: "#bdbdbd",objectFit: "fill",width: "60%",height: "30%"}}></video>
						</div>
					</div>
					:
					<div>
						<div className="btn-down" style={{ backgroundColor: "whitesmoke", color: "whitesmoke", textAlign: "center" }}>

							{this.state.screenAvailable === true ?
								<IconButton style={{ color: "#424242" }} onClick={this.handleScreen}>
									{this.state.screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
								</IconButton>
								: null}

							<Badge badgeContent={this.state.newmessages} max={999} color="secondary" onClick={this.openChat}>
								<IconButton style={{ color: "#424242" }} onClick={this.openChat}>
									<ChatIcon />
								</IconButton>
							</Badge>
						</div>

						<Modal show={this.state.showModal} onHide={this.closeChat} style={{ zIndex: "999999" }}>
							<Modal.Header closeButton>
								<Modal.Title>Chat Room</Modal.Title>
							</Modal.Header>
							<Modal.Body style={{ overflow: "auto", overflowY: "auto", height: "400px", textAlign: "left" }} >
								{this.state.messages.length > 0 ? this.state.messages.map((item, index) => (
									<div key={index} style={{textAlign: "left"}}>
										<p style={{ wordBreak: "break-all" }}><b>{item.sender}</b>: {item.data}</p>
									</div>
								)) : <p>No message yet</p>}
							</Modal.Body>
							<Modal.Footer className="div-send-msg">
								<Input placeholder="Message" value={this.state.message} onChange={e => this.handleMessage(e)} />
								<Button variant="contained" color="primary" onClick={this.sendMessage}>Send</Button>
							</Modal.Footer>
						</Modal>

						<div className="container">
							<div style={{ paddingTop: "20px" }}>
								<Input value={window.location.href} disable="true"></Input>
								<Button style={{backgroundColor: "#3f51b5",color: "whitesmoke",marginLeft: "20px",
									marginTop: "10px",width: "120px",fontSize: "10px"
								}} onClick={this.copyUrl}>Copy invite link</Button>
							</div>

							<Row id="main" className="flex-container" style={{ margin: 0, padding: 0 }}>
								<video id="my-video" className='video-js' controls={true} ref={this.localVideoref} autoPlay muted style={{
									borderStyle: "solid",borderColor: "#bdbdbd",margin: "10px",objectFit: "fill",
									width: "100%",height: "auto"}} src={this.state.videoUrl}></video>
							</Row>
						</div>
					</div>
				}
			</div>
		)
	}
}

export default Video