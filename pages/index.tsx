import { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, ScrollArea, Stack, Text, TextInput } from '@mantine/core';
import useBase64AudioPlayer from './hooks/useBase64AudioPlayer';


const Home = () => {
  const [messages, setMessages] = useState<{ content: string; role: string }[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const { addChunk, stopAndFlush } = useBase64AudioPlayer((state) => {
    console.log('Audio player state:', state);
  });

  // Handle sending a message
  const handleSend = () => {
    // add user message to the chat
    stopAndFlush();
    
    const newMessages = [...messages, { content: input, role: 'user' }];
    setMessages(newMessages);

    // URL encode the messages array
    const urlEncodedMessages = encodeURIComponent(JSON.stringify(newMessages));

    if (eventSource) {
      // Close the previous event source if it exists
      eventSource.close();
    }

    const url = `/api/chat?messages=${urlEncodedMessages}`;
    setEventSource(new EventSource(url));
  };

  // Handle incoming messages from SSE
  useEffect(() => {
    if (eventSource) {
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);          
          if (data.text) {
            setMessages((prevMessages) => {
              if (prevMessages[prevMessages.length - 1]?.role === 'assistant') {
                // Append the last assistant message with the new text
                return [
                  ...prevMessages.slice(0, -1),
                  { content: prevMessages[prevMessages.length - 1].content + data.text, role: 'assistant' },
                ];
              }
              else {
                // Add the new text as a assistant message
                return [
                  ...prevMessages,
                  { content: data.text, role: 'assistant' },
                ];
              }
            });
          }
          else if (data.audio){
            addChunk(data);
          }
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close(); // Close connection on error
      };

      return () => {
        eventSource.close(); // Clean up connection on component unmount
      };
    }
  }, [eventSource]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Container>
      <ScrollArea style={{ height: 400, overflowY: 'auto' }}>
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
    </Container>
  );
};

export default Home;
