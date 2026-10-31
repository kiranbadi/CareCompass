import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { HardDrive, MessageCircle, Plus, Search, Send, X } from "lucide-react";
import { demoProviders } from "../search/providers";
import "./messages.css";

interface ChatMessage {
  id: string;
  author: "me" | "provider";
  text: string;
  createdAt: string;
}
interface Conversation {
  id: string;
  providerId: string;
  subject: string;
  unread: number;
  messages: ChatMessage[];
  updatedAt: string;
}
interface Inbox {
  version: 1;
  conversations: Conversation[];
}
const keyFor = (userId: string): string =>
  `carebridge:messages:v1:${encodeURIComponent(userId)}`;
function seedInbox(): Inbox {
  const now = Date.now();
  const at = (minutes: number): string =>
    new Date(now - minutes * 60000).toISOString();
  return {
    version: 1,
    conversations: [
      {
        id: "demo-maya",
        providerId: "maya",
        subject: "Getting to know your care needs",
        unread: 0,
        updatedAt: at(20),
        messages: [
          {
            id: "maya-1",
            author: "provider",
            text: "Hi! This is a sample conversation. A calm routine and a little time to get to know each other can make a great start.",
            createdAt: at(90),
          },
          {
            id: "maya-2",
            author: "me",
            text: "Thank you! Could we talk about sensory-friendly activities and weekend support?",
            createdAt: at(55),
          },
          {
            id: "maya-3",
            author: "provider",
            text: "Absolutely. We could start with drawing, a quiet activity, and regular breaks. What does a comfortable day look like?",
            createdAt: at(20),
          },
        ],
      },
      {
        id: "demo-jordan",
        providerId: "jordan",
        subject: "Everyday companionship",
        unread: 1,
        updatedAt: at(60),
        messages: [
          {
            id: "jordan-1",
            author: "me",
            text: "I would like to learn more about companionship and support with everyday routines.",
            createdAt: at(150),
          },
          {
            id: "jordan-2",
            author: "provider",
            text: "Happy to introduce myself. A shared interest, such as books or a gentle garden walk, is a lovely place to begin. This is fictional demo content.",
            createdAt: at(60),
          },
        ],
      },
      {
        id: "demo-avery",
        providerId: "avery",
        subject: "Planning a little extra support",
        unread: 0,
        updatedAt: at(180),
        messages: [
          {
            id: "avery-1",
            author: "provider",
            text: "Welcome to this sample chat. We can use this space to explore what a helpful care plan might include.",
            createdAt: at(180),
          },
        ],
      },
    ],
  };
}
function readInbox(raw: string): Inbox {
  const data = JSON.parse(raw) as Inbox;
  if (!data || data.version !== 1 || !Array.isArray(data.conversations))
    throw new Error("Invalid saved inbox");
  if (
    !data.conversations.every(
      (c) =>
        c &&
        typeof c.id === "string" &&
        typeof c.providerId === "string" &&
        typeof c.subject === "string" &&
        typeof c.updatedAt === "string" &&
        Number.isInteger(c.unread) &&
        c.unread >= 0 &&
        Array.isArray(c.messages) &&
        c.messages.every(
          (m) =>
            m &&
            typeof m.id === "string" &&
            (m.author === "me" || m.author === "provider") &&
            typeof m.text === "string" &&
            typeof m.createdAt === "string",
        ),
    )
  )
    throw new Error("Invalid saved conversation");
  return data;
}
function timeLabel(value: string): string {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
function dayLabel(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function Messages({ userId }: { userId: string }) {
  const storageKey = keyFor(userId);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [activeId, setActiveId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [creating, setCreating] = useState(false);
  const [providerId, setProviderId] = useState("maya");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function load(): void {
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw === null ? seedInbox() : readInbox(raw);
        if (raw === null)
          localStorage.setItem(storageKey, JSON.stringify(saved));
        setInbox(saved);
        setActiveId((current) =>
          saved.conversations.some((c) => c.id === current)
            ? current
            : (saved.conversations[0]?.id ?? ""),
        );
        setBlocked(false);
        setError(null);
      } catch {
        setInbox((current) => current ?? seedInbox());
        setActiveId((current) => current || "demo-maya");
        setBlocked(true);
        setError(
          "Saved messages could not be loaded. Showing a read-only demo; existing browser data has not been overwritten.",
        );
      }
    }
    load();
    const listener = (event: StorageEvent): void => {
      if (event.key === storageKey || event.key === null) load();
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [storageKey]);
  const active = inbox?.conversations.find((c) => c.id === activeId);
  const provider = demoProviders.find((p) => p.id === active?.providerId);
  useEffect(() => {
    const container = bottomRef.current?.parentElement;
    if (container) container.scrollTop = container.scrollHeight;
  }, [activeId, active?.messages.length]);
  function update(change: (current: Inbox) => Inbox): boolean {
    if (blocked) return false;
    try {
      const raw = localStorage.getItem(storageKey);
      const next = change(raw === null ? inbox! : readInbox(raw));
      localStorage.setItem(storageKey, JSON.stringify(next));
      setInbox(next);
      setError(null);
      return true;
    } catch {
      setError(
        "Could not save messages to browser storage. Your message has been kept; check storage and try again.",
      );
      return false;
    }
  }
  function selectConversation(id: string): void {
    setActiveId(id);
    setCreating(false);
    setNotice(null);
    if (!blocked)
      update((current) => ({
        ...current,
        conversations: current.conversations.map((c) =>
          c.id === id ? { ...c, unread: 0 } : c,
        ),
      }));
  }
  function send(): void {
    const text = (drafts[activeId] ?? "").trim();
    if (!text || !active || blocked) return;
    const now = new Date().toISOString();
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      author: "me",
      text,
      createdAt: now,
    };
    if (
      update((current) => {
        if (!current.conversations.some((c) => c.id === activeId))
          throw new Error("Conversation missing");
        return {
          ...current,
          conversations: current.conversations.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: [...c.messages, message],
                  updatedAt: now,
                  unread: 0,
                }
              : c,
          ),
        };
      })
    ) {
      setDrafts((current) => ({ ...current, [activeId]: "" }));
      setNotice(
        "Message saved locally. It was not delivered to a real person.",
      );
      composeRef.current?.focus();
    }
  }
  function submit(event: FormEvent): void {
    event.preventDefault();
    send();
  }
  function keyboard(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      send();
    }
  }
  function create(event: FormEvent): void {
    event.preventDefault();
    if (blocked) return;
    const existing = inbox?.conversations.find(
      (c) => c.providerId === providerId,
    );
    if (existing) {
      selectConversation(existing.id);
      setNotice("Opened your existing conversation with this sample provider.");
      return;
    }
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      providerId,
      subject: subject.trim() || "Care planning",
      unread: 0,
      messages: [],
      updatedAt: now,
    };
    if (
      update((current) => ({
        ...current,
        conversations: [...current.conversations, conversation],
      }))
    ) {
      setActiveId(conversation.id);
      setCreating(false);
      setSubject("");
      setSearch("");
      setUnreadOnly(false);
      setNotice("Demo conversation created in this browser.");
    }
  }
  if (!inbox) return <p role="status">Loading your messages…</p>;
  const conversations = [...inbox.conversations]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((c) => {
      const person = demoProviders.find((p) => p.id === c.providerId);
      return (
        (!unreadOnly || c.unread > 0) &&
        `${person?.name ?? "Sample provider"} ${c.subject}`
          .toLowerCase()
          .includes(search.toLowerCase().trim())
      );
    });
  const totalUnread = inbox.conversations.reduce(
    (total, c) => total + c.unread,
    0,
  );
  return (
    <div className="messages-module">
      <div className="local-storage-note">
        <HardDrive size={20} aria-hidden="true" />
        <p>
          <strong>Demo messages · Saved in this browser.</strong> Conversations
          are fictional and stored for this account on this device. No messages
          are delivered, no provider is notified, and there are no automatic
          replies. Use sample content only.
        </p>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="inbox-shell">
        <aside className="inbox-sidebar" aria-label="Conversations">
          <div className="inbox-title">
            <h2>
              Conversations <span>{totalUnread}</span>
            </h2>
            <button
              className="icon-button"
              aria-label="New conversation"
              disabled={blocked}
              onClick={() => {
                setCreating(!creating);
                setNotice(null);
              }}
            >
              <Plus size={20} />
            </button>
          </div>
          {creating && (
            <form
              className="new-conversation"
              onSubmit={create}
              aria-label="New conversation form"
            >
              <div className="record-form-heading">
                <h3>New conversation</h3>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Close new conversation"
                  onClick={() => setCreating(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <label htmlFor="conversation-provider">Sample provider</label>
              <select
                id="conversation-provider"
                value={providerId}
                onChange={(event) => setProviderId(event.target.value)}
              >
                {demoProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <label htmlFor="conversation-subject">
                Subject <span>(optional)</span>
              </label>
              <input
                id="conversation-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
                placeholder="e.g. Weekend care planning"
              />
              <button type="submit" className="primary-button">
                Start conversation
              </button>
            </form>
          )}
          <label className="inbox-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search conversations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              maxLength={120}
            />
          </label>
          <div
            className="inbox-filters"
            role="group"
            aria-label="Conversation filter"
          >
            <button
              aria-pressed={!unreadOnly}
              onClick={() => setUnreadOnly(false)}
            >
              All messages
            </button>
            <button
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly(true)}
            >
              Unread
            </button>
          </div>
          <div className="conversation-list">
            {conversations.map((c) => {
              const person = demoProviders.find((p) => p.id === c.providerId);
              const last = c.messages.at(-1);
              return (
                <button
                  key={c.id}
                  className={`conversation-item ${activeId === c.id ? "selected" : ""}`}
                  aria-current={activeId === c.id ? "true" : undefined}
                  onClick={() => selectConversation(c.id)}
                >
                  <span className={`demo-avatar ${person?.color ?? "sage"}`}>
                    {person?.initials ?? "CP"}
                  </span>
                  <span className="conversation-preview">
                    <span className="conversation-name">
                      {person?.name ?? "Sample provider"}
                      <small>{dayLabel(c.updatedAt)}</small>
                    </span>
                    <span className="conversation-subject">{c.subject}</span>
                    <span className="conversation-snippet">
                      {last?.author === "me" ? "You: " : ""}
                      {last?.text ?? "No messages yet. Start a conversation."}
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span
                      className="unread-count"
                      aria-label={`${c.unread} unread messages`}
                    >
                      {c.unread}
                    </span>
                  )}
                </button>
              );
            })}
            {!conversations.length && (
              <div className="inbox-empty">
                <MessageCircle size={24} aria-hidden="true" />
                <p>No conversations match.</p>
                <button
                  onClick={() => {
                    setSearch("");
                    setUnreadOnly(false);
                  }}
                >
                  Show all conversations
                </button>
              </div>
            )}
          </div>
        </aside>
        <section className="chat-panel" aria-label="Selected conversation">
          {active ? (
            <>
              <header className="chat-header">
                <span className={`demo-avatar ${provider?.color ?? "sage"}`}>
                  {provider?.initials ?? "CP"}
                </span>
                <div>
                  <h2>{provider?.name ?? "Sample provider"}</h2>
                  <p>{active.subject}</p>
                </div>
                <span className="chat-demo-label">DEMO CHAT</span>
              </header>
              <div
                className="chat-history"
                role="log"
                aria-label="Conversation messages"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {active.messages.length ? (
                  active.messages.map((message, index) => (
                    <div key={message.id}>
                      <div className="chat-day">
                        {index === 0 ||
                        dayLabel(message.createdAt) !==
                          dayLabel(active.messages[index - 1].createdAt)
                          ? dayLabel(message.createdAt)
                          : null}
                      </div>
                      <div
                        className={`message-row ${message.author === "me" ? "outgoing" : "incoming"}`}
                      >
                        <div className="message-bubble">
                          <span className="message-author">
                            {message.author === "me"
                              ? "You"
                              : (provider?.name ?? "Sample provider")}
                          </span>
                          <p>{message.text}</p>
                          <span className="message-time">
                            {timeLabel(message.createdAt)}
                            {message.author === "me" ? " · Saved locally" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="inbox-empty">
                    <MessageCircle size={30} aria-hidden="true" />
                    <h3>A little connection starts here.</h3>
                    <p>Write the first message in this demo conversation.</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <form
                className="message-composer"
                onSubmit={submit}
                aria-label="Write a message"
              >
                <div className="quick-replies">
                  {[
                    "Thanks for the update.",
                    "Could we discuss availability?",
                    "Let’s review the care plan.",
                  ].map((text) => (
                    <button
                      key={text}
                      type="button"
                      disabled={blocked}
                      onClick={() => {
                        setDrafts((current) => ({
                          ...current,
                          [activeId]: text,
                        }));
                        composeRef.current?.focus();
                      }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <label htmlFor="message-text" className="visually-hidden">
                  Message
                </label>
                <textarea
                  id="message-text"
                  ref={composeRef}
                  value={drafts[activeId] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [activeId]: event.target.value,
                    }))
                  }
                  onKeyDown={keyboard}
                  maxLength={2000}
                  rows={3}
                  placeholder="Write a thoughtful message…"
                  disabled={blocked}
                  aria-describedby="message-help"
                />
                <div className="composer-bottom">
                  <span id="message-help">
                    Ctrl / ⌘ + Enter to send · {(drafts[activeId] ?? "").length}
                    /2000
                  </span>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={blocked || !(drafts[activeId] ?? "").trim()}
                  >
                    <Send size={16} aria-hidden="true" />
                    Send message
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="inbox-empty">
              <MessageCircle size={35} aria-hidden="true" />
              <h3>Your conversations, together.</h3>
              <p>Select a conversation or start a new one.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
