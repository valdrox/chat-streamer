import { IconRobotFace } from '@tabler/icons-react';
import { Group, Mark, rem, Text } from '@mantine/core';

interface MessageProps {
  content: string;
  role: 'user' | 'assistant';
  isLast: boolean;
  startIndex: number | null;
  endIndex: number | null;
}

const Message = ({ content, role, isLast, startIndex, endIndex }: MessageProps) => {

  // Conditionally handle highlighted text only for the last message
  const renderContent = () => {
    if (isLast && startIndex !== null && endIndex !== null) {
      return (
        <Text span >
          <Text span>{content.slice(0, startIndex)}</Text>
          <Mark color="grape">{content.slice(startIndex, endIndex)}</Mark>
          <Text span>{content.slice(endIndex)}</Text>
        </Text>
      );
    }

    // Render normal content for non-last messages or when indices are not defined
    return (
      <Text >{content}</Text>
    );
  };

  return (
    <Group
      justify={role === 'user' ? 'flex-end' : 'flex-start'}
      align="start"
      style={{
        whiteSpace: 'pre-wrap',
      }}

    >
      {role === 'assistant' && (
        <IconRobotFace
          style={{ width: rem(24), height: rem(24) }}
        />
      )}
      {renderContent()}
    </Group>
  );
};

export default Message;
