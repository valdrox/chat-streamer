import Head from 'next/head';
import { Container, Grid } from '@mantine/core';
import Chatbot from '@/components/Chatbot';
import Tutorial from '../components/tutorial.mdx';

const Home = () => {
  return (
    <>
      <Head>
        <title>Build a realtime voice chatbot with any voice</title>
        <meta name="description" content="This is a description of my awesome page." />
        <meta property="og:title" content="My Awesome Page" />
        <meta property="og:description" content="This is a description of my awesome page." />
        <meta property="og:image" content="https://example.com/preview-image.jpg" />
        <meta property="og:url" content="https://example.com/page-url" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="My Awesome Page" />
        <meta name="twitter:description" content="This is a description of my awesome page." />
        <meta name="twitter:image" content="https://example.com/preview-image.jpg" />
      </Head>
      <main>
        <Container>
          <Tutorial />
          <div id="demo">
            <Chatbot />
          </div>
        </Container>
      </main>
    </>
  );
};

export default Home;
