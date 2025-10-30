import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqwovvrvwozwrjonksgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxd292dnJ2d296d3Jqb25rc2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTc4Mzk4MCwiZXhwIjoyMDc3MzU5OTgwfQ.1aiTrflaqZ0CgLlOlYUUsBVGI1CFN2Sq5K1VlMxXJUQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestDigest() {
  const testDigest = {
    title: 'Test ML Monday Digest',
    category: 'ml_monday',
    published_date: new Date().toISOString().split('T')[0],
    content: [
      {
        title: 'GPT-5 Announced by OpenAI',
        url: 'https://example.com/gpt5',
        summary: 'OpenAI announces GPT-5 with groundbreaking capabilities in reasoning and multimodal understanding.',
        source: 'OpenAI Blog'
      },
      {
        title: 'Google DeepMind Releases AlphaFold 3',
        url: 'https://example.com/alphafold3',
        summary: 'AlphaFold 3 achieves unprecedented accuracy in protein structure prediction.',
        source: 'Nature'
      },
      {
        title: 'Meta AI Introduces Llama 4',
        url: 'https://example.com/llama4',
        summary: 'Meta\'s latest open-source language model shows impressive performance on benchmarks.',
        source: 'Meta AI'
      }
    ],
    status: 'published',
    view_count: 42
  };

  const { data, error } = await supabase
    .from('digests')
    .insert(testDigest)
    .select()
    .single();

  if (error) {
    console.error('Error adding test digest:', error);
    process.exit(1);
  }

  console.log('✅ Test digest added successfully!');
  console.log('Digest ID:', data.id);
  console.log('\nNow refresh your blog to see it!');
}

addTestDigest();

