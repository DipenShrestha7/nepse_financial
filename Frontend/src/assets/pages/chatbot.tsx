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

type ChatSession = {
  session_id: number;
  title?: string;
  created_at?: string;
};

type StoredChatMessage = {
  message_id?: number;
  role: string;
  content: string;
};

const WELCOME_MESSAGE: Message = {
  id: 1,
  text: "Hello! I'm Mero Market assistant. Ask me about a company.",
  from: "bot",
};

export default function Chatbot() {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getCurrentUser()));
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [searchText, setSearchText] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [busySessionId, setBusySessionId] = useState<number | null>(null);
  const [deleteConfirmingSessionId, setDeleteConfirmingSessionId] = useState<
    number | null
  >(null);

  const loadHistory = async () => {
    const token = getAuthToken();
    if (!token) {
      setHistory([]);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/chat/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to fetch chat history:", data?.error || data);
        return;
      }
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  };

  const loadSessionMessages = async (targetSessionId: number) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(
        `http://localhost:8000/sessions/${targetSessionId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to fetch session messages:", data?.error || data);
        return;
      }

      const mapped: Message[] = (Array.isArray(data) ? data : []).map(
        (m: StoredChatMessage, idx: number) => ({
          id: Number(m.message_id ?? Date.now() + idx),
          text: m.content,
          from: m.role === "user" ? "user" : "bot",
        }),
      );

      setMessages(mapped.length ? mapped : [WELCOME_MESSAGE]);
      setSessionId(targetSessionId);
      setActiveSessionId(targetSessionId);
    } catch (err) {
      console.error("Error fetching session messages:", err);
    }
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(Boolean(getCurrentUser()));
    window.addEventListener("auth-changed", syncAuth);
    return () => window.removeEventListener("auth-changed", syncAuth);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setHistory([]);
      setMessages([WELCOME_MESSAGE]);
      setSessionId(null);
      setActiveSessionId(null);
      return;
    }
    loadHistory();
  }, [isLoggedIn]);

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
        const nextSessionId = Number(data.session_id);
        setSessionId(nextSessionId);
        setActiveSessionId(nextSessionId);
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
      loadHistory();
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

  const startEditSession = (session: ChatSession) => {
    setEditingSessionId(session.session_id);
    setEditingTitle(session.title || `Session ${session.session_id}`);
  };

  const cancelEditSession = () => {
    setEditingSessionId(null);
    setEditingTitle("");
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const saveSessionTitle = async (targetSessionId: number) => {
    const token = getAuthToken();
    if (!token) {
      console.error("No token found");
      return;
    }

    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      console.error("Title is empty");
      return;
    }

    console.log("Saving session", targetSessionId, "with title:", nextTitle);
    setBusySessionId(targetSessionId);

    try {
      const res = await fetch(
        `http://localhost:8000/sessions/${targetSessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: nextTitle,
          }),
        },
      );

      console.log("Response status:", res.status, "ok:", res.ok);
      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        console.error("Failed to update session title:", data?.error || data);
        setBusySessionId(null);
        return;
      }

      // Update the history with the new title
      setHistory((prev) =>
        prev.map((s) =>
          s.session_id === targetSessionId
            ? {
                ...s,
                title: data?.title || nextTitle,
              }
            : s,
        ),
      );

      console.log("Session saved successfully");

      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.blur();
        }
        setEditingSessionId(null);
        setEditingTitle("");
        setBusySessionId(null);
      }, 0);
    } catch (err) {
      console.error("Error updating session title:", err);
      setBusySessionId(null);
    }
  };

  const confirmDeleteSession = (targetSessionId: number) => {
    setDeleteConfirmingSessionId(targetSessionId);
  };

  const cancelDeleteSession = () => {
    setDeleteConfirmingSessionId(null);
  };

  const deleteSession = async (targetSessionId: number) => {
    const token = getAuthToken();
    if (!token) return;

    setDeleteConfirmingSessionId(null);
    setBusySessionId(targetSessionId);

    try {
      const res = await fetch(
        `http://localhost:8000/sessions/${targetSessionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to delete session:", data?.error || data);
        return;
      }

      setHistory((prev) =>
        prev.filter((s) => s.session_id !== targetSessionId),
      );

      if (activeSessionId === targetSessionId) {
        setMessages([WELCOME_MESSAGE]);
        setSessionId(null);
        setActiveSessionId(null);
      }

      if (editingSessionId === targetSessionId) {
        cancelEditSession();
      }
    } catch (err) {
      console.error("Error deleting session:", err);
    } finally {
      setBusySessionId(null);
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
                  setMessages([WELCOME_MESSAGE]);
                  setSessionId(null);
                  setActiveSessionId(null);
                }}
              >
                + New chat
              </button>

              <div className="sidebar-search">
                <input
                  placeholder="Search chats"
                  className="market-input"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="bg-white/4 border border-white/2"></div>
            </div>

            <nav className="history-list" aria-label="Chat history">
              {history
                .filter((s) => {
                  if (!searchText.trim()) return true;
                  const title = (
                    s.title || `Session ${s.session_id}`
                  ).toLowerCase();
                  return title.includes(searchText.trim().toLowerCase());
                })
                .map((s) => {
                  const title = s.title || `Session ${s.session_id}`;
                  const preview =
                    title.length > 48 ? title.slice(0, 45) + "..." : title;
                  const isEditing = editingSessionId === s.session_id;
                  const isBusy = busySessionId === s.session_id;

                  return (
                    <div
                      key={s.session_id}
                      className={`history-item ${activeSessionId === s.session_id ? "active" : ""} ${isEditing ? "editing" : ""}`}
                      onClick={() =>
                        !isEditing && loadSessionMessages(s.session_id)
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (
                          (e.key === "Enter" || e.key === " ") &&
                          !isEditing
                        ) {
                          e.preventDefault();
                          loadSessionMessages(s.session_id);
                        }
                      }}
                    >
                      {isEditing ? (
                        <>
                          <input
                            ref={inputRef}
                            className="history-edit-input"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveSessionTitle(s.session_id);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEditSession();
                              }
                            }}
                            onBlur={() => {}}
                            autoFocus
                            disabled={isBusy}
                          />
                          <div className="history-actions">
                            <button
                              type="button"
                              className="history-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                saveSessionTitle(s.session_id);
                              }}
                              disabled={isBusy || !editingTitle.trim()}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="history-action-btn history-action-btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelEditSession();
                              }}
                              disabled={isBusy}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="history-title">{preview}</div>
                          <div className="history-actions">
                            <button
                              type="button"
                              className="history-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditSession(s);
                              }}
                              disabled={isBusy}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="history-action-btn history-action-btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteSession(s.session_id);
                              }}
                              disabled={isBusy}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                      <div className="history-meta">
                        {isBusy ? "Working..." : ""}
                      </div>
                    </div>
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

        {deleteConfirmingSessionId !== null && (
          <DeleteConfirmationModal
            sessionId={deleteConfirmingSessionId}
            onConfirm={() => deleteSession(deleteConfirmingSessionId)}
            onCancel={cancelDeleteSession}
          />
        )}
      </div>
    </main>
  );
}

interface DeleteConfirmationModalProps {
  sessionId: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmationModal({
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  return (
    <div className="delete-confirmation-overlay">
      <div className="delete-confirmation-backdrop" onClick={onCancel} />
      <div className="delete-confirmation-modal">
        <h3 className="delete-confirmation-title">Delete Chat Session?</h3>
        <p className="delete-confirmation-message">
          This chat session will be permanently deleted. This action cannot be
          undone.
        </p>
        <div className="delete-confirmation-actions">
          <button
            type="button"
            className="delete-confirmation-btn delete-confirmation-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-confirmation-btn delete-confirmation-btn-delete"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
