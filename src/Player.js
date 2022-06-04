import React from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-landscape-fullscreen'

export default class VideoPlayer extends React.Component {

  // Instantiate a Video.js player when the component mounts
  componentDidMount() {
    this.player = videojs(this.videoNode, this.props.options, () => {
      videojs.log('onPlayerReady', this);
      this.props.onReady && this.props.onReady(this.player)
    });
    // configure plugins
    this.player.landscapeFullscreen({
        fullscreen: {
          enterOnRotate: true,
          exitOnRotate: true,
          alwaysInLandscapeMode: true,
          iOS: true
        }
      });
  }

  // Dispose the player when the component will unmount
  componentWillUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }

  // Wrap the player in a `div` with a `data-vjs-player` attribute, so Video.js
  // won't create additional wrapper in the DOM.
  //
  // See: https://github.com/videojs/video.js/pull/3856
  render() {
    return (
      <div data-vjs-player>
        <video ref={node => this.videoNode = node} className="video-js" controlsList='nodownload'></video>
      </div>
    );
  }
}