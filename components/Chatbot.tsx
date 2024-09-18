import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  useMantineTheme,
} from '@mantine/core';
import { Base64AudioPlayer } from '../pages/classes/Base64AudioPlayer';

const Chatbot = () => {
  const [messages, setMessages] = useState<{ content: string; role: string }[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const audioPlayerRef = useRef<Base64AudioPlayer | null>(null);
  const theme = useMantineTheme();
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);

  useEffect(() => {
    audioPlayerRef.current = new Base64AudioPlayer((startIndex, endIndex) => {
      setStartIndex(startIndex);
      setEndIndex(endIndex);
    });

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
    setInput('');

    audioPlayerRef.current?.resumeIfSuspended(); // browser requirement
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
        console.error('EventSource error:', error);
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
    <Container
      style={{
        height: '100%',
        maxHeight: '50%',
        overflow: 'hidden',
        display: 'flex',
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
            <Card
              key={index}
              shadow="sm"
              padding="sm"
              radius="md"
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                backgroundColor: msg.role === 'user' ? theme.colors.blue[0] : theme.colors.teal[0],
                maxWidth: '80%',
                whiteSpace: 'pre-wrap'
              }}
            >
              {index !== messages.length - 1 ? (
                <Text color={msg.role === 'user' ? theme.colors.blue[7] : theme.colors.teal[7]}>
                  {msg.content}
                </Text>
              ) : (
                <Text
                  span
                  color={msg.role === 'user' ? theme.colors.blue[7] : theme.colors.teal[7]}
                >
                  <Text span>{msg.content.slice(0, startIndex)}</Text>
                  <Text span color={theme.colors.red[7]}>{msg.content.slice(startIndex, endIndex)}</Text>
                  <Text span>{msg.content.slice(endIndex)}</Text>
                </Text>
              )}
            </Card>
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
