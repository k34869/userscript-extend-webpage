import hello from './exectors/hello';

export default [
  {
    paths: '*://www.example.com/*',
    exectors: hello,
  },
];
