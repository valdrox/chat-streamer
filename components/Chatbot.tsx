import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useMantineTheme,
} from '@mantine/core';
import useChatbot, { Message as MessageType } from '../hooks/useChatbot'; // Import custom hook
import Message from './Message';

const Chatbot = () => {
  const [input, setInput] = useState('');
  const theme = useMantineTheme();

  const { messages, startListening, setMessages, startIndex, endIndex, audioPlayerRef } =
    useChatbot(); // Use the custom hook

  const handleSend = () => {
    audioPlayerRef.current?.stopAndFlush(); // Stop audio playback if necessary
    const newMessages: MessageType[] = [...messages, { content: input, role: 'user' }];
    setMessages(newMessages); // Update message state
    startListening(newMessages); // Start the EventSource listener
    setInput(''); // Clear input field
  };

  return (
    <Card
      style={{
        minHeight: 400,
        overflow: 'hidden',
        display: 'flex',
        width: '100%',
        flexDirection: 'column',
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.gray[0],
      }}
    >
      <ScrollArea style={{ flex: 1, padding: theme.spacing.md, overflow: 'auto' }}>
        <Text ta="center" fw={500} size="lg">
          Your-Voice-Enabled Chatbot
        </Text>
        <Stack gap="md" mt="xl">
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
        <Button onClick={handleSend} variant="default" color="gray">Send</Button>
      </Box>
    </Card>
  );
};

export default Chatbot;
