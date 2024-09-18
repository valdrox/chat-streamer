import { Card, Text, useMantineTheme } from '@mantine/core';

interface MessageProps {
  content: string;
  role: 'user' | 'assistant';
  isLast: boolean;
  startIndex: number | null;
  endIndex: number | null;
}

const Message = ({ content, role, isLast, startIndex, endIndex }: MessageProps) => {
  const theme = useMantineTheme();

  // Conditionally handle highlighted text only for the last message
  const renderContent = () => {
    if (isLast && startIndex !== null && endIndex !== null) {
      return (
        <Text span color={role === 'user' ? theme.colors.blue[7] : theme.colors.teal[7]}>
          <Text span>{content.slice(0, startIndex)}</Text>
          <Text span color={theme.colors.red[7]}>{content.slice(startIndex, endIndex)}</Text>
          <Text span>{content.slice(endIndex)}</Text>
        </Text>
      );
    }
    
    // Render normal content for non-last messages or when indices are not defined
    return (
      <Text color={role === 'user' ? theme.colors.blue[7] : theme.colors.teal[7]}>
        {content}
      </Text>
    );
  };

  return (
    <Card
      shadow="sm"
      padding="sm"
      radius="md"
      style={{
        alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
        backgroundColor: role === 'user' ? theme.colors.blue[0] : theme.colors.teal[0],
        maxWidth: '80%',
        whiteSpace: 'pre-wrap',
      }}
    >
      {renderContent()}
    </Card>
  );
};

export default Message;
