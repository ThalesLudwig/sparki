import type { JiraIssue, JiraComment, JiraDescription, JiraContentNode } from '../types/index.js';

const getConfig = () => {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      'Missing Jira configuration. Set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.'
    );
  }

  return { baseUrl, email, apiToken };
};

const getAuthHeader = (): string => {
  const { email, apiToken } = getConfig();
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
};

const buildUrl = (path: string): string => {
  const { baseUrl } = getConfig();
  return `${baseUrl.replace(/\/$/, '')}/rest/api/3${path}`;
};

export const getIssue = async (issueKey: string): Promise<JiraIssue> => {
  const url = buildUrl(`/issue/${issueKey}?expand=renderedFields`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch issue ${issueKey}: ${response.status} - ${error}`);
  }

  return response.json();
};

export const getIssueComments = async (issueKey: string): Promise<JiraComment[]> => {
  const url = buildUrl(`/issue/${issueKey}/comment`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch comments for ${issueKey}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.comments || [];
};

export const postComment = async (issueKey: string, commentBody: string): Promise<JiraComment> => {
  const url = buildUrl(`/issue/${issueKey}/comment`);

  const adfBody = {
    version: 1,
    type: 'doc',
    content: commentBody.split('\n\n').map((paragraph) => ({
      type: 'paragraph',
      content: paragraph.split('\n').flatMap((line, index, arr) => {
        const nodes: JiraContentNode[] = [{ type: 'text', text: line }];
        if (index < arr.length - 1) {
          nodes.push({ type: 'hardBreak' });
        }
        return nodes;
      }),
    })),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: adfBody }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to post comment to ${issueKey}: ${response.status} - ${error}`);
  }

  return response.json();
};

export const extractTextFromDescription = (description: JiraDescription | null): string => {
  if (!description || !description.content) {
    return '';
  }

  const extractText = (nodes: JiraContentNode[]): string => {
    return nodes
      .map((node) => {
        if (node.text) {
          const linkMark = node.marks?.find((m) => m.type === 'link');
          if (linkMark && linkMark.attrs?.href) {
            return `${node.text} (${linkMark.attrs.href})`;
          }
          return node.text;
        }
        if (node.type === 'inlineCard' && node.attrs?.url) {
          return node.attrs.url as string;
        }
        if (node.content) {
          return extractText(node.content);
        }
        if (node.type === 'hardBreak') {
          return '\n';
        }
        return '';
      })
      .join('');
  };

  return extractText(description.content);
};

export const formatIssueForAnalysis = (issue: JiraIssue, comments: JiraComment[] = []): string => {
  const description = extractTextFromDescription(issue.fields.description);
  const labels = issue.fields.labels.join(', ') || 'None';
  const components = issue.fields.components.map((c) => c.name).join(', ') || 'None';
  const attachments = issue.fields.attachment?.map((a) => a.filename).join(', ') || 'None';

  let content = `
# Jira Ticket: ${issue.key}

## Summary
${issue.fields.summary}

## Type
${issue.fields.issuetype.name}

## Status
${issue.fields.status.name}

## Priority
${issue.fields.priority?.name || 'Not set'}

## Labels
${labels}

## Components
${components}

## Attachments
${attachments}

## Description
${description || '(No description provided)'}
`;

  if (comments.length > 0) {
    content += `\n## Comments (${comments.length})\n`;
    for (const comment of comments) {
      const commentText = extractTextFromDescription(comment.body);
      const date = new Date(comment.created).toLocaleDateString();
      content += `\n### ${comment.author.displayName} (${date})\n${commentText}\n`;
    }
  }

  return content.trim();
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    const { baseUrl } = getConfig();
    const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3/myself`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
        Accept: 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to connect to Jira:', error);
    return false;
  }
};

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
  };
}

export const getTransitions = async (issueKey: string): Promise<JiraTransition[]> => {
  const url = buildUrl(`/issue/${issueKey}/transitions`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get transitions for ${issueKey}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.transitions || [];
};

export const transitionIssue = async (issueKey: string, transitionId: string): Promise<void> => {
  const url = buildUrl(`/issue/${issueKey}/transitions`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transition: { id: transitionId } }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to transition ${issueKey}: ${response.status} - ${error}`);
  }
};

export const transitionToInProgress = async (issueKey: string): Promise<boolean> => {
  try {
    const transitions = await getTransitions(issueKey);

    // Look for common "in progress" transition names
    const inProgressNames = [
      'in progress',
      'start progress',
      'doing',
      'em andamento',
      'sendo feito',
      'start',
    ];
    const transition = transitions.find((t) =>
      inProgressNames.some(
        (name) => t.name.toLowerCase().includes(name) || t.to.name.toLowerCase().includes(name)
      )
    );

    if (!transition) {
      console.log(
        `⚠️  No "In Progress" transition found. Available: ${transitions.map((t) => t.name).join(', ')}`
      );
      return false;
    }

    await transitionIssue(issueKey, transition.id);
    return true;
  } catch (error) {
    console.error(`Failed to transition issue to In Progress:`, error);
    return false;
  }
};

export const extractFigmaLinks = (issue: JiraIssue, comments: JiraComment[] = []): string[] => {
  const links: string[] = [];
  const figmaRegex = /https:\/\/(?:www\.)?figma\.com\/(?:file|design)\/[a-zA-Z0-9]+[^\s)"]*/g;

  const descriptionText = extractTextFromDescription(issue.fields.description);
  const descMatches = descriptionText.match(figmaRegex);
  if (descMatches) links.push(...descMatches);

  for (const comment of comments) {
    const commentText = extractTextFromDescription(comment.body);
    const commentMatches = commentText.match(figmaRegex);
    if (commentMatches) links.push(...commentMatches);
  }

  return [...new Set(links)];
};

export interface JiraAttachment {
  id: string;
  filename: string;
  mimeType: string;
  url: string;
  size: number;
}

const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

export const extractImageAttachments = (issue: JiraIssue): JiraAttachment[] => {
  const attachments = issue.fields.attachment || [];
  return attachments
    .filter((a) => IMAGE_MIME_TYPES.includes(a.mimeType))
    .map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      url: a.content,
      size: a.size,
    }));
};

export const downloadAttachment = async (url: string): Promise<Buffer> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download attachment: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
