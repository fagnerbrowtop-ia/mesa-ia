```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mesa de IAs</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      background: #1a1a1a;
      padding: 1rem;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    header h1 {
      font-size: 1.2rem;
      color: #fff;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .header-actions button {
      background: #333;
      border: none;
      color: #aaa;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
    }

    .header-actions button:hover {
      background: #444;
      color: #fff;
    }

    .agents-bar {
      background: #1a1a1a;
      padding: 0.75rem 1rem;
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid #333;
      flex-wrap: wrap;
    }

    .agent-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .agent-btn.claude { background: #d97706; color: #fff; }
    .agent-btn.gpt { background: #10a37f; color: #fff; }
    .agent-btn.gemini { background: #4285f4; color: #fff; }
    .agent-btn.diabo { background: #dc2626; color: #fff; }

    .agent-btn:hover {
      opacity: 0.85;
      transform: scale(1.05);
    }

    .agent-btn.active {
      box-shadow: 0 0 0 3px rgba(255,255,255,0.3);
    }

    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .message {
      max-width: 85%;
      padding: 1rem;
      border-radius: 12px;
      line-height: 1.5;
    }

    .message.user {
      background: #2a2a2a;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    .message.assistant {
      background: #1e1e1e;
      border: 1px solid #333;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .message .agent-tag {
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }

    .message .agent-tag.claude { color: #d97706; }
    .message .agent-tag.gpt { color: #10a37f; }
    .message .agent-tag.gem
