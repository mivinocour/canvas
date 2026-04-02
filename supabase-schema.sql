-- Canvas App Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create spaces table
CREATE TABLE spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create widget_templates table (for gallery)
CREATE TABLE widget_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    prompt TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create widget_instances table (widgets placed in spaces)
CREATE TABLE widget_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    template_id UUID REFERENCES widget_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    custom_code TEXT, -- if user modified the template code
    instance_data JSONB DEFAULT '{}', -- widget-specific settings/state
    version INTEGER DEFAULT 1,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sync_metadata table (for conflict resolution)
CREATE TABLE sync_metadata (
    device_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    last_local_change TIMESTAMPTZ,
    last_server_sync TIMESTAMPTZ DEFAULT NOW(),
    pending_changes JSONB,
    PRIMARY KEY (device_id, table_name, record_id)
);

-- Create indexes for performance
CREATE INDEX idx_spaces_user_id ON spaces(user_id);
CREATE INDEX idx_widget_templates_author_id ON widget_templates(author_id);
CREATE INDEX idx_widget_templates_public ON widget_templates(is_public) WHERE is_public = true;
CREATE INDEX idx_widget_templates_category ON widget_templates(category);
CREATE INDEX idx_widget_instances_space_id ON widget_instances(space_id);
CREATE INDEX idx_widget_instances_template_id ON widget_instances(template_id);
CREATE INDEX idx_widget_instances_user_id ON widget_instances(user_id);
CREATE INDEX idx_sync_metadata_lookup ON sync_metadata(table_name, record_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_templates_updated_at BEFORE UPDATE ON widget_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_instances_updated_at BEFORE UPDATE ON widget_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- Spaces policies
CREATE POLICY "Users can view own spaces" ON spaces
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spaces" ON spaces
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spaces" ON spaces
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own spaces" ON spaces
    FOR DELETE USING (auth.uid() = user_id);

-- Widget templates policies
CREATE POLICY "Users can view public templates" ON widget_templates
    FOR SELECT USING (is_public = true OR auth.uid() = author_id);

CREATE POLICY "Users can insert own templates" ON widget_templates
    FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own templates" ON widget_templates
    FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own templates" ON widget_templates
    FOR DELETE USING (auth.uid() = author_id);

-- Widget instances policies
CREATE POLICY "Users can view own widget instances" ON widget_instances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widget instances" ON widget_instances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widget instances" ON widget_instances
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widget instances" ON widget_instances
    FOR DELETE USING (auth.uid() = user_id);

-- Sync metadata policies
CREATE POLICY "Users can manage own sync metadata" ON sync_metadata
    FOR ALL USING (true); -- We'll handle this in app logic since device_id isn't tied to user_id

-- Insert some sample public templates to get started
INSERT INTO widget_templates (name, description, code, prompt, author_id, is_public, category, tags) VALUES
(
    'Simple Counter',
    'A basic click counter widget',
    'import React, { useState } from "react"; export default function Counter() { const [count, setCount] = useState(0); return (<div className="p-4 text-center"><h2 className="text-xl mb-4">Counter: {count}</h2><button onClick={() => setCount(count + 1)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Click me!</button></div>); }',
    'Create a simple counter widget that increments when clicked',
    NULL, -- Will be set to first admin user
    true,
    'utility',
    ARRAY['counter', 'example', 'simple']
),
(
    'Todo List',
    'A simple task management widget',
    'import React, { useState } from "react"; export default function TodoList() { const [todos, setTodos] = useState([]); const [input, setInput] = useState(""); const addTodo = () => { if (input.trim()) { setTodos([...todos, { id: Date.now(), text: input, done: false }]); setInput(""); } }; const toggleTodo = (id) => { setTodos(todos.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo)); }; return (<div className="p-4"><h3 className="font-bold mb-3">Todo List</h3><div className="flex gap-2 mb-3"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === "Enter" && addTodo()} placeholder="Add task..." className="flex-1 px-2 py-1 border rounded" /><button onClick={addTodo} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Add</button></div><div className="space-y-1">{todos.map(todo => (<div key={todo.id} className="flex items-center gap-2"><input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} /><span className={todo.done ? "line-through text-gray-500" : ""}>{todo.text}</span></div>))}</div></div>); }',
    'Create a todo list widget with add/complete functionality',
    NULL,
    true,
    'productivity',
    ARRAY['todo', 'tasks', 'productivity']
);

-- Create function to handle template downloads
CREATE OR REPLACE FUNCTION increment_download_count(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE widget_templates
    SET download_count = download_count + 1
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;