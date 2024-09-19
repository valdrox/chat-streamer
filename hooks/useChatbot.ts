import { useEffect, useState, useRef } from 'react';
import { Base64AudioPlayer } from '../classes/Base64AudioPlayer';

export interface Message {
  content: string;
  role: 'user' | 'assistant';
}

const useChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const audioPlayerRef = useRef<Base64AudioPlayer | null>(null);

  // Initialize the audio player and set startIndex, endIndex handlers
  useEffect(() => {
    audioPlayerRef.current = new Base64AudioPlayer((startIdx, endIdx) => {
      setStartIndex(startIdx);
      setEndIndex(endIdx);
    });

    return () => {
      audioPlayerRef.current?.stopAndFlush();
    };
  }, []);

  const startListening = (newMessages: Message[]) => {
    const urlEncodedMessages = encodeURIComponent(JSON.stringify(newMessages));

    // Close any previous EventSource connections
    if (eventSource) {
      eventSource.close();
    }

    const url = `/api/chat?messages=${urlEncodedMessages}`;
    const newEventSource = new EventSource(url);
    setEventSource(newEventSource);

    audioPlayerRef.current?.resumeIfSuspended(); // browser requirement

    // Handle incoming messages from the server
    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.text) {
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              // Append to the last assistant message
              return [
                ...prevMessages.slice(0, -1),
                {
                  content: lastMessage.content + data.text,
                  role: 'assistant',
                },
              ];
            } else {
              // Create a new assistant message
              return [...prevMessages, { content: data.text, role: 'assistant' }];
            }
          });
        } else if (data.audio) {
          audioPlayerRef.current?.addChunk(data);
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    newEventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      newEventSource.close();
    };

    return () => {
      newEventSource.close();
    };
  };

  return {
    messages,
    startListening,
    setMessages,
    startIndex,
    endIndex,
    audioPlayerRef,
  };
};

export default useChatbot;
