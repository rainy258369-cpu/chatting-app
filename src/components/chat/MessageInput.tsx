import { useState } from "react"

export default function MessageInput({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return
    onSend(value)
    setValue("")
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", padding: 10, gap: 8 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="输入消息..."
        style={{
          flex: 1,
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
        }}
      />
      <button
        type="submit"
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          background: "#4f46e5",
          color: "#fff",
          border: 0,
          cursor: "pointer",
        }}
      >
        发送
      </button>
    </form>
  )
}


