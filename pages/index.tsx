import Head from 'next/head';
import { Container, Grid } from '@mantine/core';
import Chatbot from '@/components/Chatbot';
import Tutorial from '../components/tutorial.mdx';

const Home = () => {
  return (
    <>
      <Head>
        <title>Build a Real-Time Voice Chatbot with Any Voice</title>
        <meta
          name="description"
          content="Learn how to build a sophisticated chatbot that speaks responses in real-time using customizable voices. Follow this tutorial to create an immersive, interactive chatbot experience with Next.js and ElevenLabs."
        />
        <meta property="og:title" content="Build a Real-Time Voice Chatbot with Any Voice" />
        <meta
          property="og:description"
          content="Discover how to create a real-time voice chatbot with customizable voices and interactive text highlighting. Build an engaging chatbot experience using Next.js, OpenAI, and ElevenLabs."
        />
        <meta property="og:image" content="https://chat-streamer-rw1r.vercel.app/screenshot.png" />
        <meta property="og:url" content="https://chat-streamer-rw1r.vercel.app/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Build a Real-Time Voice Chatbot with Any Voice" />
        <meta
          name="twitter:description"
          content="Create an advanced chatbot that responds in real-time with customizable voices and interactive text highlighting. Follow this guide to build an engaging chatbot experience."
        />
        <meta name="twitter:image" content="https://chat-streamer-rw1r.vercel.app/screenshot.png" />
      </Head>
      <main>
        <Container>
          <Tutorial />
          <div id="demo" style={{ marginTop: 30 }}>
            <Chatbot />
          </div>
        </Container>
      </main>
    </>
  );
};

export default Home;
