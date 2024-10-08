import React, { useState, useCallback, useEffect, useRef } from 'react'
import SpeechRecognition, {
    useSpeechRecognition,
} from 'react-speech-recognition'
import axios from 'axios'
import '../Style/Chat.css'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase-config'
import { useNavigate } from 'react-router-dom'

const Chat = () => {
    const [loading, setLoading] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [botMessage, setBotMessage] = useState('')
    const navigate = useNavigate()
    const speechSynthesisRef = useRef(null)

    const { transcript, listening, resetTranscript } = useSpeechRecognition()

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                window.speechSynthesis.cancel()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange
            )
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
        }
    }, [])

    const speakBotMessage = useCallback((text) => {
        window.speechSynthesis.cancel()

        const chunks = splitTextIntoChunks(text)
        let currentChunkIndex = 0

        const speakNextChunk = () => {
            if (currentChunkIndex < chunks.length) {
                const speech = new SpeechSynthesisUtterance(
                    chunks[currentChunkIndex]
                )
                const voices = window.speechSynthesis.getVoices()

                const betterVoice = voices.find(
                    (voice) =>
                        voice.lang.includes('hi-IN') ||
                        voice.lang.includes('ur-PK')
                )

                if (betterVoice) {
                    speech.voice = betterVoice
                } else {
                    console.warn('No suitable voice found, using default.')
                }

                speechSynthesisRef.current = speech
                setIsSpeaking(true)

                speech.onend = () => {
                    currentChunkIndex++
                    speakNextChunk()
                }

                window.speechSynthesis.speak(speech)
            } else {
                speechSynthesisRef.current = null
                setIsSpeaking(false)
            }
        }

        speakNextChunk()
    }, [])

    const splitTextIntoChunks = (text, maxLength = 200) => {
        const chunks = []
        let currentChunk = ''

        const sentences = text.split(/([.,!?]+\s)/)

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i]
            if ((currentChunk + sentence).length <= maxLength) {
                currentChunk += sentence
            } else {
                if (currentChunk) chunks.push(currentChunk.trim())
                currentChunk = sentence
            }
        }

        if (currentChunk) chunks.push(currentChunk.trim())

        return chunks
    }

    const handleSendMessage = useCallback(async (inputText) => {
        if (inputText.trim() !== '') {
            setLoading(true)
            setBotMessage('')
            try {
                const response = await axios.post(
                    'https://api.openai.com/v1/chat/completions',
                    {
                        model: 'gpt-3.5-turbo',
                        messages: [{ role: 'user', content: inputText }],
                        max_tokens: 150,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
                setBotMessage(response.data.choices[0].message.content)
                speakBotMessage(response.data.choices[0].message.content)
            } catch (error) {
                console.error('Error fetching response from OpenAI:', error)
            }
            setLoading(false)
        }
    }, [speakBotMessage])

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
        return <div>Your browser doesn't support speech recognition.</div>
    }

    const handleLogout = async () => {
        try {
            await signOut(auth)
            navigate('/login')
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const listen = () => {
        if (listening) {
            SpeechRecognition.stopListening()
            handleSendMessage(transcript)
            resetTranscript()
        } else {
            if (isSpeaking) {
                setIsSpeaking(false)
                window.speechSynthesis.cancel()
            }
            resetTranscript()
            SpeechRecognition.startListening({ continuous: true })
        }
    }

    return (
        <div className='chat-container'>
            {isSpeaking && (
                <div className='speaking-indicator'>
                    <img
                        src='speaking.gif'
                        alt='Speaking'
                        className='speaking-image'
                    />
                    <div className='caption'>{botMessage}</div>
                </div>
            )}
            {!isSpeaking && (
                <div className='speaking-indicator'>
                    <img
                        src='assistant.png'
                        alt='Speaking'
                        className='speaking-image'
                    />
                    <div className='caption'>{botMessage}</div>
                </div>
            )}

            <div className='input-container'>
                <button
                    onClick={listen}
                    className='voice-button'
                    disabled={loading}>
                    {listening ? 'Stop Speaking' : 'Start Speaking'}
                </button>

                <button
                    onClick={handleLogout}
                    disabled={loading || listening}
                    className='logout-button'>
                    Logout
                </button>
            </div>
        </div>
    )
}

export default Chat

