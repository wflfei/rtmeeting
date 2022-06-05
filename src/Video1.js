import React, { Component } from 'react'
import io from 'socket.io-client'
import faker from "faker"

import {IconButton, Badge, Input, Button} from '@material-ui/core'
import ChatIcon from '@material-ui/icons/Chat'

// import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'
import VideoPlayer from './Player'
import 'bootstrap/dist/css/bootstrap.css'
import "./Video.css"

const server_url = process.env.NODE_ENV === 'production' ? 'http://47.106.117.192' : "http://192.168.0.105"

var connections = {}
var socket = null
var socketId = null
var elms = 0

class Video extends Component {
	constructor(props) {
		super(props)

		this.localVideoref = React.createRef()
		this.playerRef = React.createRef()

		this.videoAvailable = false
		this.audioAvailable = false
		this.videoUrl = null
		this.videoTime = 0
		this.videoPaused = false
		this.lastCurrentTime = 0

		this.state = {
			video: false,
			audio: false,
			screen: false,
			showModal: true,
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
		socket = io.connect(server_url, { secure: true, cors: true })

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
				console.table(videoInfo)
				this.videoTime = videoInfo.play_time
				this.setState({
					videoUrl: videoInfo.video_url
				}, () => {
					// if (this.videoTime != 0) {
					// 	this.seekToTime()
					// }
					// this.listenVideoTime()
				})
			})

			socket.on('video-time', (newTime, sender, socketIdSender) => {
				console.log('got remote time: ' + newTime)
				this.videoTime = newTime
				this.seekToTime()
			})

			socket.on('video-state', (paused, sender, socketIdSender) => {
				console.log('got remote state: ' + paused)
				this.videoPaused = paused
				if (paused) {
					this.pauseVideo()
				} else {
					this.playVideo()
				}
			})

			socket.on('user-joined', (id, clients) => {
				console.log("user joined")
				setTimeout(() => {
					if (this.videoUrl && this.playerRef.current) {
						let cTime = this.playerRef.current.currentTime()
						console.log("give new user time: " + cTime)
						this.uploadVideoTime(cTime)
					}
				}, 2500);
			})
			// 连接成功
			this.setState({
				connected: true
			})
		})
	}

	openChat = () => this.setState({ showModal: true, newmessages: 0 })
	closeChat = () => this.setState({ showModal: false })
	toggleChat = () => {
		if (this.state.showModal) {
			this.closeChat()
		} else {
			this.openChat()
		}
	}
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
		this.playerRef.current && this.playerRef.current.currentTime(this.videoTime)
	}

	// listenVideoTime = () => {
	// 	let video = document.getElementById('my-video')
	// 	video.addEventListener('timeupdate', () => {
	// 		var currentTime = Math.floor(video.currentTime);
	// 		if (currentTime - this.lastCurrentTime > 1 || currentTime - this.lastCurrentTime < 0) {
	// 			console.log(currentTime)
	// 			if (Math.abs(currentTime - this.videoTime) > 5) {
	// 				this.uploadVideoTime(currentTime)
	// 			}
	// 		}
	// 		this.lastCurrentTime = currentTime;
	// 	})
	// 	video.addEventListener('play', () => {
	// 		this.uploadVideoState(false)
	// 	})
	// 	video.addEventListener('pause', () => {
	// 		this.uploadVideoState(true)
	// 	})
	// }

	onVideoPlayerReady = (player) => {
		this.playerRef.current = player

		player.on('seeked', () => {
			let currentTime = this.playerRef.current.currentTime()
			if (Math.abs(currentTime - this.videoTime) > 5) {
				this.uploadVideoTime(currentTime)
			}
		})

		// player.on('play', () => {
		// 	this.uploadVideoState(false)
		// })
	  
		// player.on('pause', (evt) => {
		// 	console.log("pause")
		// 	console.table(evt)
		// 	this.uploadVideoState(true)
		// })

		// PC端和手机Chrome触发click
		player.controlBar.playToggle.on("click", () => {
			let p = this.playerRef.current.paused()
			console.log("click pause: " + p)
			this.uploadVideoState(p)
		})

		// 手机其他浏览器及微信QQ等触发tap
		player.controlBar.playToggle.on("tap", () => {
			let p = this.playerRef.current.paused()
			console.log("tap pause: " + p)
			this.uploadVideoState(p)
		})

		// player.controlBar.playToggle.on("touchend", () => {
		// 	let p = this.playerRef.current.paused()
		// 	console.log("touchend pause: " + p)
		// 	this.uploadVideoState(p)
		// })

		// player.controlBar.playToggle.on("mouseup", () => {
		// 	let p = this.playerRef.current.paused()
		// 	console.log("mouseup pause: " + p)
		// 	this.uploadVideoState(p)
		// })

	}

	// handleUsername = (e) => this.setState({ username: e.target.value })
	handleVideoUrl = (e) => {
		this.videoUrl = e.target.value
	}

	uploadVideoTime = (newTime) => {
		socket.emit('video-time', newTime, this.state.username)
	}

	uploadVideoState = (paused) => {
		socket.emit('video-state', paused, this.state.username)
	}

	sendMessage = () => {
		socket.emit('chat-message', this.state.message, this.state.username)
		this.setState({ message: "", sender: this.state.username })
	}

	playVideo = () => {
		if (!this.playerRef.current) {
			 return
		}
		const player = this.playerRef.current
		if (player && player.paused()) {
			player.play()
		}
	}

	pauseVideo = () => {
		if (!this.playerRef.current) {
			return
	   }
	   const player = this.playerRef.current
	   if (player && (!player.paused())) {
		   player.pause()
	   }
	}

	connect = () => {
		socket.emit('video-url', this.videoUrl)
	}

	componentDidMount() {
		this.connectToSocketServer()
	}

	render() {
		let isM3u8 = this.state.videoUrl && this.state.videoUrl.indexOf("m3u8") > 0
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
					<div >
						<div style={{backgroundColor: "#223", height: '100vh', zIndex: 1}}></div>
					
						<div className='video-container'>

							<VideoPlayer options={
								{
									width: "100%", 
									aspectRatio: "16:9", 
									controls: true, 
									autoplay: true, 
									muted: true, 
									controlsList: 'nodownload', 
									sources: [{src: this.state.videoUrl, type: isM3u8 ? "application/x-mpegURL" : null}],
									userActions: {
										doubleClick: true
									},
									preferFullWindow: true,
									fullscreen: {navigationUI: 'show'}
								}}
								style={{marginTop: "3px",objectFit: "fill", width: "100vw",height: "56.25vw"}}
								onReady={this.onVideoPlayerReady}>
							</VideoPlayer>
						</div>

						<div className='chat-content-down' hidden={!this.state.showModal} style={{ backgroundColor: "#223", color: "#bbb"}}>
							<Modal.Body style={{ overflow: "auto", overflowY: "auto", height: "300px", textAlign: "left" }} >
									{this.state.messages.length > 0 ? this.state.messages.map((item, index) => (
										<div key={index} style={{textAlign: "left"}}>
											<p style={{ wordBreak: "break-all", color: "#bbb" }}><b>{item.sender}</b>: {item.data}</p>
										</div>
									)) : <p>No message yet</p>}
							</Modal.Body>
							<div className="div-send-msg" style={{background: '#223', borderTop: '1px solid #112', paddingTop: '3px', paddingBottom: '5px'}}>
								<Input placeholder="Message" value={this.state.message} onChange={e => this.handleMessage(e)} style={{color: "#bbb"}}
									onKeyPress={(e) => {
										if (e.key === "Enter") {
										  this.sendMessage()
										}
									  }} />
								<Button variant="contained" color="primary" onClick={this.sendMessage} style={{color: "#bbb", marginLeft: '5px'}}>Send</Button>
							</div>
						</div>

						{/* <div className="chat-down" style={{ backgroundColor: "#223", color: "#bbb", textAlign: "center"}}>
							<Badge badgeContent={this.state.newmessages} max={999} color="secondary" onClick={this.toggleChat}>
								<IconButton style={{ color: "#424242" }} onClick={this.toggleChat}>
									<ChatIcon />
								</IconButton>
							</Badge>
						</div> */}
					</div>
				}
			</div>
		)
	}
}

export default Video