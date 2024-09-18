// components/Chatbot.tsx
import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Container,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useMantineTheme,
} from '@mantine/core';
import useChatbot from '../hooks/useChatbot'; // Import custom hook
import Message from './Message';

const Chatbot = () => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const theme = useMantineTheme();

  const {
    messages,
    startListening,
    setMessages,
    startIndex,
    endIndex,
    audioPlayerRef,
  } = useChatbot(); // Use the custom hook

  const handleSend = () => {
    audioPlayerRef.current?.stopAndFlush(); // Stop audio playback if necessary
    const newMessages = [...messages, { content: input, role: 'user' }];
    setMessages(newMessages); // Update message state
    startListening(newMessages); // Start the EventSource listener
    setInput(''); // Clear input field
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Container
      style={{
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        width: '100%',
        flexDirection: 'column',
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.gray[0],
      }}
    >
      <ScrollArea style={{ flex: 1, padding: theme.spacing.md, overflow: 'auto' }}>
        <Text
          align="center"
          weight={700}
          style={{ fontSize: '1.5rem', marginBottom: theme.spacing.md }}
        >
          Demo
        </Text>
        <Stack spacing="md">
          {messages.map((msg, index) => (
            <Message
              key={index}
              content={msg.content}
              role={msg.role as 'user' | 'assistant'}
              isLast={index === messages.length - 1}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          ))}
          <div ref={scrollRef} />
        </Stack>
      </ScrollArea>
      <Box mt="md" style={{ display: 'flex', gap: theme.spacing.sm, padding: theme.spacing.sm }}>
        <TextInput
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          placeholder="Type your message"
          style={{ flexGrow: 1 }}
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend}>Send</Button>
      </Box>
    </Container>
  );
};

export default Chatbot;
