import { useEffect, useRef, useState } from 'react';
import { Box, Button, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import { Base64AudioPlayer } from '../pages/classes/Base64AudioPlayer';

const Chatbot = () => {
  const [messages, setMessages] = useState<{ content: string; role: string }[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const audioPlayerRef = useRef<Base64AudioPlayer | null>(null);

  useEffect(() => {
    audioPlayerRef.current = new Base64AudioPlayer((state) => {});

    return () => {
      audioPlayerRef.current?.stopAndFlush();
    };
  }, []);

  const handleSend = () => {
    audioPlayerRef.current?.stopAndFlush();
    const newMessages = [...messages, { content: input, role: 'user' }];
    setMessages(newMessages);

    const urlEncodedMessages = encodeURIComponent(JSON.stringify(newMessages));

    if (eventSource) {
      eventSource.close();
    }

    const url = `/api/chat?messages=${urlEncodedMessages}`;
    setEventSource(new EventSource(url));
  };

  useEffect(() => {
    if (eventSource) {
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            setMessages((prevMessages) => {
              if (prevMessages[prevMessages.length - 1]?.role === 'assistant') {
                return [
                  ...prevMessages.slice(0, -1),
                  {
                    content: prevMessages[prevMessages.length - 1].content + data.text,
                    role: 'assistant',
                  },
                ];
              } else {
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

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error, event);
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    }
  }, [eventSource]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <ScrollArea style={{ height: "100%", overflowY: 'auto' }}>
        <Stack spacing="sm">
          {messages.map((msg, index) => (
            <Box key={index} align={msg.role === 'user' ? 'right' : 'left'}>
              <Text color={msg.role === 'user' ? 'blue' : 'green'}>{msg.content}</Text>
            </Box>
          ))}
          <div ref={scrollRef} />
        </Stack>
      </ScrollArea>
      <Box mt="md" style={{ display: 'flex', gap: '0.5rem' }}>
        <TextInput
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Type your message"
          style={{ flexGrow: 1 }}
        />
        <Button onClick={handleSend}>Send</Button>
      </Box>
    </>
  );
};

export default Chatbot;
