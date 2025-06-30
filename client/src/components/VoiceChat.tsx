import React, { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'
import Peer from 'simple-peer'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceChatProps {
  socket: Socket
  roomId: string
}

const VoiceChat: React.FC<VoiceChatProps> = ({ socket, roomId }) => {
  const [peers, setPeers] = useState<any[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isInChat, setIsInChat] = useState(false)
  const peersRef = useRef<any[]>([])
  const userVideo = useRef<HTMLVideoElement>(null)

  const joinVoiceChat = () => {
    navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      .then(stream => {
        setLocalStream(stream)
        if(userVideo.current) {
          userVideo.current.srcObject = stream
        }
        setIsInChat(true)

        socket.emit('join-voice', roomId)
        
        const handleAllUsers = (users: string[]) => {
          if (!socket.id) return
          
          const createdPeers: any[] = []
          users.forEach(userID => {
            const peer = createPeer(userID, socket.id!, stream)
            peersRef.current.push({
              peerID: userID,
              peer,
            })
            createdPeers.push({peerID: userID, peer})
          })
          setPeers(createdPeers)
        }

        const handleUserJoined = (payload: any) => {
          const peer = addPeer(payload.signal, payload.callerID, stream)
          peersRef.current.push({
            peerID: payload.callerID,
            peer,
          })
          setPeers(currentPeers => [...currentPeers, {peerID: payload.callerID, peer}])
        }
        
        const handleReceivingSignal = (payload: any) => {
          const item = peersRef.current.find(p => p.peerID === payload.id)
          item.peer.signal(payload.signal)
        }
        
        socket.on('all-users', handleAllUsers)
        socket.on('user-joined', handleUserJoined)
        socket.on('receiving-returned-signal', handleReceivingSignal)

      }).catch(err => {
        console.error("Failed to get local stream", err);
        alert("Could not get microphone access. Please check your browser permissions.");
      })
  }
  
  const leaveVoiceChat = () => {
    localStream?.getTracks().forEach(track => track.stop())
    socket.emit('leave-voice', roomId);
    socket.off('all-users')
    socket.off('user-joined')
    socket.off('receiving-returned-signal')
    peersRef.current.forEach(({ peer }) => peer.destroy())
    setPeers([])
    peersRef.current = []
    setLocalStream(null)
    setIsInChat(false)
  }

  useEffect(() => {
    return () => {
      if (isInChat) {
        leaveVoiceChat()
      }
    }
  }, [isInChat])
  
  function createPeer(userToSignal: string, callerID: string, stream: MediaStream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    })
    
    peer.on('signal', signal => {
      socket.emit('sending-signal', { userToSignal, callerID, signal })
    })
    
    return peer
  }

  function addPeer(incomingSignal: Peer.SignalData, callerID: string, stream: MediaStream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    })
    
    peer.on('signal', signal => {
      socket.emit('returning-signal', { signal, callerID })
    })
    
    peer.signal(incomingSignal)
    return peer
  }
  
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  return (
    <div className="absolute bottom-4 right-4 bg-[#dbeafe] dark:bg-[#1e293b] border border-[#60a5fa] dark:border-[#334155] p-2 rounded-lg shadow-lg z-10 voice-chat-wrapper">
      <div className="flex items-center gap-2 text-[#1e293b] dark:text-white">
        <video ref={userVideo} muted autoPlay playsInline style={{ display: 'none' }} />
        {isInChat && peers.map(({ peerID, peer }) => (
          <Audio key={peerID} peer={peer} />
        ))}
        {isInChat ? (
          <>
            <Button onClick={toggleMute} size="icon" variant="ghost" className="rounded-full">
              {isMuted ? <MicOff className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />}
            </Button>
            <Button onClick={leaveVoiceChat} size="sm" variant="destructive">
              Leave
            </Button>
          </>
        ) : (
          <Button onClick={joinVoiceChat} size="sm" className="bg-[#1e3a5c] hover:bg-[#274472] text-white dark:bg-[#60a5fa] dark:hover:bg-[#3b82f6]">
            Join Voice
          </Button>
        )}
      </div>
    </div>
  )
}

const Audio = (props: any) => {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    props.peer.on('stream', (stream: MediaStream) => {
      if (ref.current) {
        ref.current.srcObject = stream
      }
    })
  }, [props.peer])
  return <audio playsInline autoPlay ref={ref} />
}

export default VoiceChat 