import bundleAnalyzer from '@next/bundle-analyzer';
import withMDX from '@next/mdx';

// Configure bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Configure MDX
const withMDXConfig = withMDX({
  extension: /\.mdx?$/,
});

// Export the configuration with both MDX and bundle analyzer
export default withBundleAnalyzer(
  withMDXConfig({
    reactStrictMode: false,
    eslint: {
      ignoreDuringBuilds: true,
    },
    pageExtensions: ['js', 'jsx', 'tsx', 'ts', 'md', 'mdx'],
  })
);
