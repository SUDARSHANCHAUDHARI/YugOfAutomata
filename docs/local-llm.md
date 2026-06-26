# Local-LLM Proxy

Local models exposed over an OpenAI-compatible API (Ollama, LM Studio, llama.cpp
servers, vLLM, …) don't write transcript files Yug of Automata can watch. The
optional logging proxy bridges that gap: it sits in front of your local endpoint,
forwards every request unchanged, and renders the traffic as a `local-llm`
automaton.

## Run it

```bash
yoa --proxy
# proxy listens on 127.0.0.1:8124, forwards to 127.0.0.1:11434 (Ollama)

yoa --proxy --proxy-port 8200 --proxy-upstream http://127.0.0.1:1234
```

Then set your tool's OpenAI base URL to the proxy:

```
http://127.0.0.1:8124/v1
```

## What it reads

- For `POST /v1/chat/completions` it records: `model`, the latest user message as
  the session title, the assistant's tool call (if any), and token usage from the
  response (`prompt_tokens` → context, `completion_tokens` → output).
- All other paths are forwarded transparently.
- Streamed responses are piped through untouched; the request still produces a
  lightweight "working" observation (without token totals).

## Sessions

By default all proxied traffic appears as one `local-llm` session. To separate
clients, send a `x-yoa-session: <id>` header — each id becomes its own automaton.

## Privacy

The proxy only forwards to the upstream you configure and binds to `127.0.0.1`.
It does not persist request or response bodies; it extracts the few fields above
and discards the rest. It is **off unless you pass `--proxy`**.
