import type { APIRoute } from 'astro';
import { createAdminClient } from '../lib/supabase';

export const GET: APIRoute = async () => {
  const supabase = createAdminClient();

  const { data: digests } = await supabase
    .from('digests_with_counts')
    .select('*')
    .eq('status', 'published')
    .order('published_date', { ascending: false })
    .limit(50);

  const siteUrl = 'https://ainewsblog.jonashaahr.com';
  const now = new Date().toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>AI News Blog</title>
    <description>Curated weekly digests of tech, AI, and web development news</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>Astro</generator>
    ${digests?.map(digest => {
      const pubDate = new Date(digest.published_date).toUTCString();
      const link = `${siteUrl}/digest/${digest.id}`;
      const articles = digest.content || [];
      
      const contentHtml = articles.map((article: any, index: number) => `
        <h3>${index + 1}. <a href="${article.url}">${article.title}</a></h3>
        <p>${article.summary}</p>
        <p><em>Source: ${article.source}</em></p>
      `).join('');

      return `
    <item>
      <title><![CDATA[${digest.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${digest.category}</category>
      <description><![CDATA[${digest.title} - ${articles.length} articles]]></description>
      <content:encoded><![CDATA[
        <h2>${digest.title}</h2>
        ${contentHtml}
        <p><a href="${link}">Read more and comment →</a></p>
      ]]></content:encoded>
    </item>`;
    }).join('')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'max-age=3600, s-maxage=3600'
    }
  });
};

