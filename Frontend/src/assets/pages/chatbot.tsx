import { useState, useRef, useEffect } from "react";
import Header from "../components/Header";
import { FiLock, FiSend } from "react-icons/fi";
import { getAuthToken, getCurrentUser } from "../../utils/authApi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id: number;
  text: string;
  from: "user" | "bot";
};

export default function Chatbot() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getCurrentUser()));
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! I'm Mero Market assistant. Ask me about a company.",
      from: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(Boolean(getCurrentUser()));
    window.addEventListener("auth-changed", syncAuth);
    return () => window.removeEventListener("auth-changed", syncAuth);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const timestamp = Date.now();
    const userMsg: Message = {
      id: timestamp,
      text: input.trim(),
      from: "user",
    };
    const placeholderId = timestamp + 1;
    const placeholderMsg: Message = {
      id: placeholderId,
      text: "Generating response...",
      from: "bot",
    };

    // Add user message and loading placeholder in one update
    setMessages((m) => [...m, userMsg, placeholderMsg]);
    setInput("");

    try {
      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken() ?? ""}`,
        },
        body: JSON.stringify({
          session_id: sessionId || null,
          message: userMsg.text,
          role: userMsg.from,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // show error in place of placeholder
        const errMsg = data?.error || "Failed to send chat message";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId ? { ...m, text: errMsg } : m,
          ),
        );
        return;
      }

      if (data?.session_id) {
        setSessionId(Number(data.session_id));
      }

      const replyText =
        typeof data?.reply === "string"
          ? data.reply
          : "Sorry, I could not generate a response right now.";

      // replace placeholder with assistant reply
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, text: replyText } : m,
        ),
      );
    } catch (err) {
      console.log("Error sending message:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId
            ? { ...m, text: "Sorry, the chatbot is unavailable right now." }
            : m,
        ),
      );
    }
  };

  return (
    <main className="market-page">
      <div className="market-shell">
        <Header />

        <div className="chat-layout">
          <aside className="chat-sidebar panel p-3">
            <div className="sidebar-header">
              <div className="sidebar-title text-4xl mx-auto">Chatbot</div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                className="w-full bg-white/4 border border-white/3 text-white py-[0.64rem] px-4 rounded-[0.6rem] cursor-pointer text-[0.86rem] text-left"
                onClick={() => {
                  setMessages([
                    {
                      id: Date.now(),
                      text: "Hello! I'm Mero Market assistant. Ask me about a company.",
                      from: "bot" as Message["from"],
                    },
                  ]);
                  setActiveSessionId(null);
                }}
              >
                + New chat
              </button>

              <div className="sidebar-search">
                <input
                  placeholder="Search chats"
                  className="market-input"
                  onChange={() => {}}
                />
              </div>
              <div className="bg-white/4 border border-white/2"></div>
            </div>

            <nav className="history-list" aria-label="Chat history">
              {messages
                .filter((m) => m.from === "user")
                .map((m) => {
                  const preview =
                    m.text.length > 48 ? m.text.slice(0, 45) + "..." : m.text;
                  return (
                    <button
                      key={m.id}
                      className={`history-item ${activeSessionId === m.id ? "active" : ""}`}
                      onClick={() => {
                        // load a simple conversation based on this user message
                        const idx = messages.findIndex((x) => x.id === m.id);
                        const botReply =
                          messages.slice(idx + 1).find((x) => x.from === "bot")
                            ?.text ?? "";
                        const convo: Message[] = [
                          {
                            id: Date.now() + 1,
                            text: "Hello! I'm Mero Market assistant. Ask me about a company.",
                            from: "bot" as Message["from"],
                          },
                          {
                            id: m.id,
                            text: m.text,
                            from: "user" as Message["from"],
                          },
                        ];
                        if (botReply)
                          convo.push({
                            id: Date.now() + 2,
                            text: botReply,
                            from: "bot" as Message["from"],
                          });
                        setMessages(convo);
                        setActiveSessionId(m.id);
                      }}
                    >
                      <div className="history-title">{preview}</div>
                      <div className="history-meta">Conversation</div>
                    </button>
                  );
                })}
            </nav>
          </aside>

          <main className="chat-main">
            {isLoggedIn ? (
              <section className="panel chat-panel p-4">
                <div ref={listRef} className="chat-list">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`mb-3 flex items-start ${m.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`inline-flex w-fit max-w-[70%] self-start rounded-md px-3 py-2 leading-snug ${m.from === "user" ? "bg-cyan-500 text-white" : "bg-white/5 text-slate-100"}`}
                      >
                        {m.from === "bot" ? (
                          <div className="prose prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          m.text
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="chat-composer">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                    placeholder="Type your message..."
                    className="market-input flex-1"
                  />
                  <button onClick={sendMessage} className="btn-primary">
                    <FiSend />
                  </button>
                </div>
              </section>
            ) : (
              <section className="panel chat-panel chat-gate">
                <FiLock className="chat-gate-icon" />
                <h3>Login Required For Chatbot</h3>
                <p>
                  You can browse other pages without login. To use the chatbot,
                  please login or create an account first.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    window.dispatchEvent(new Event("open-auth-overlay"))
                  }
                >
                  Open Login
                </button>
              </section>
            )}
          </main>
        </div>
      </div>
    </main>
  );
}
