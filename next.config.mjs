import bundleAnalyzer from '@next/bundle-analyzer';
import withMDX from '@next/mdx';
import remarkPrism from 'remark-prism';
// Configure bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Configure MDX
const withMDXConfig = withMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkPrism],
  },
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
