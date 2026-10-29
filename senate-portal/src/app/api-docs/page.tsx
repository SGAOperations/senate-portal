'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';

import '@scalar/api-reference-react/style.css';

export default function ApiDocsPage() {
  return (
    <ApiReferenceReact
      configuration={{
        // eslint-disable-next-line
        _integration: 'nextjs',
        url: '/openapi.json',
      }}
    />
  );
}
