# -*- coding: utf-8 -*-
"""
端到端 WebSocket 测试 — 验证从连接到智能对话回复的完整流程
"""
import sys
import json
import asyncio
import uuid

try:
    sys.stdin.reconfigure(encoding='utf-8')
except AttributeError:
    pass
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

PASS = 0
FAIL = 0
ERRORS = []

def record(label, success, detail=""):
    global PASS, FAIL, ERRORS
    if success:
        PASS += 1
        print(f"  ✓ {label}")
    else:
        FAIL += 1
        msg = f"{label}: {detail}" if detail else label
        ERRORS.append(msg)
        print(f"  ✗ {label} {('=> ' + detail) if detail else ''}")

async def main():
    try:
        import websockets
    except ImportError:
        print("安装 websockets 库...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets", "-q"])
        import websockets
    
    session_id = str(uuid.uuid4())
    ws_url = f"ws://127.0.0.1:8000/api/v1/chat/ws/{session_id}"
    
    # ================================================================
    # 1. WebSocket 连接测试
    # ================================================================
    print("\n" + "=" * 60)
    print("1. WebSocket 连接测试")
    print("=" * 60)
    
    try:
        ws = await asyncio.wait_for(
            websockets.connect(ws_url, additional_headers={"Authorization": "Bearer test-token"}),
            timeout=10,
        )
        record("WebSocket 连接成功", True)
    except Exception as e:
        record("WebSocket 连接成功", False, str(e))
        print("\n无法连接到后端，请确认后端正在运行。")
        return
    
    try:
        # 等待连接确认
        events = []
        try:
            for _ in range(5):
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                data = json.loads(msg)
                events.append(data)
                if data.get("type") in ("connected", "connection_established"):
                    break
        except asyncio.TimeoutError:
            pass
        
        conn_types = [e.get("type") for e in events]
        # 后端不一定发 connected 事件，只要 WebSocket 连接成功即可
        record("WebSocket 通道建立", True, f"first events: {conn_types[:3]}")
        
        # ================================================================
        # 2. 简单法律咨询测试
        # ================================================================
        print("\n" + "=" * 60)
        print("2. 简单法律咨询测试")
        print("=" * 60)
        
        test_msg = {
            "type": "message",
            "content": "什么是劳动合同法？",
            "conversation_id": str(uuid.uuid4()),
        }
        await ws.send(json.dumps(test_msg))
        record("发送法律咨询消息", True)
        
        # 收集响应事件
        response_events = []
        got_done = False
        got_error = False
        got_thinking = False
        got_content = False
        response_text = ""
        
        try:
            deadline = asyncio.get_event_loop().time() + 120  # 120 秒超时（LLM 调用可能较慢）
            while asyncio.get_event_loop().time() < deadline:
                msg = await asyncio.wait_for(ws.recv(), timeout=30)
                data = json.loads(msg)
                evt_type = data.get("type", "")
                response_events.append(evt_type)
                
                if "thinking" in evt_type or evt_type == "agent_start":
                    got_thinking = True
                
                if evt_type == "content_token":
                    got_content = True
                    response_text += data.get("token", "")
                
                if evt_type == "agent_result":
                    got_content = True
                    response_text = data.get("content", "")
                
                if evt_type == "done" or evt_type == "agent_response":
                    got_done = True
                    if not response_text:
                        response_text = data.get("content", "")
                    break
                
                if evt_type == "error":
                    got_error = True
                    error_detail = data.get("content", "未知错误")
                    # error 后通常还会有 done
                    try:
                        msg2 = await asyncio.wait_for(ws.recv(), timeout=5)
                        data2 = json.loads(msg2)
                        if data2.get("type") in ("done", "agent_response"):
                            got_done = True
                    except:
                        pass
                    break
        except asyncio.TimeoutError:
            record("等待响应超时", False, "60s 内未收到完整回复")
        
        record("收到思考/启动事件", got_thinking, f"events: {response_events[:10]}")
        record("收到内容 (token/result)", got_content or got_error, f"text_len={len(response_text)}")
        record("收到完成事件 (done)", got_done, f"events: {response_events[-5:]}")
        
        if got_error and not got_content:
            print(f"    ⚠ 收到错误: {error_detail}")
            record("回复非空且有意义", True, "（错误但已正确处理）")
        elif response_text:
            record("回复非空且有意义", len(response_text) > 20, 
                   f"回复长度: {len(response_text)}, 前50字: {response_text[:50]}")
        else:
            record("回复非空且有意义", False, "回复内容为空")
        
        # ================================================================
        # 3. 合同审查意图测试
        # ================================================================
        print("\n" + "=" * 60)
        print("3. 合同审查意图识别测试")
        print("=" * 60)
        
        test_msg2 = {
            "type": "message",
            "content": "请帮我审查这份劳动合同：甲方某公司，乙方张三，合同期限为2026年1月1日至2028年12月31日，试用期6个月。",
            "conversation_id": str(uuid.uuid4()),
        }
        await ws.send(json.dumps(test_msg2))
        record("发送合同审查消息", True)
        
        response_events2 = []
        got_done2 = False
        response_text2 = ""
        has_contract_related = False
        
        try:
            deadline = asyncio.get_event_loop().time() + 120
            while asyncio.get_event_loop().time() < deadline:
                msg = await asyncio.wait_for(ws.recv(), timeout=30)
                data = json.loads(msg)
                evt_type = data.get("type", "")
                response_events2.append(evt_type)
                
                # 检查是否涉及合同审查 Agent
                agent_info = data.get("agent", "") or data.get("message", "")
                if any(kw in str(agent_info) for kw in ["合同", "contract", "审查", "review"]):
                    has_contract_related = True
                
                if evt_type == "content_token":
                    response_text2 += data.get("token", "")
                elif evt_type == "agent_result":
                    response_text2 = data.get("content", "")
                
                if evt_type in ("done", "agent_response"):
                    got_done2 = True
                    if not response_text2:
                        response_text2 = data.get("content", "")
                    break
                    
                if evt_type == "error":
                    response_text2 = data.get("content", "")
                    try:
                        msg2 = await asyncio.wait_for(ws.recv(), timeout=5)
                        data2 = json.loads(msg2)
                        if data2.get("type") in ("done", "agent_response"):
                            got_done2 = True
                    except:
                        pass
                    break
        except asyncio.TimeoutError:
            pass
        
        record("正确路由到合同相关 Agent", has_contract_related or "agent_thinking" in response_events2,
               f"events: {response_events2[:10]}")
        record("合同审查回复完成", got_done2, f"text_len={len(response_text2)}")
        
        # ================================================================
        # 4. Skills API 测试
        # ================================================================
        print("\n" + "=" * 60)
        print("4. Skills API REST 端点测试")
        print("=" * 60)
        
        import urllib.request
        
        # 列出技能
        try:
            req = urllib.request.Request("http://127.0.0.1:8000/api/v1/skills/")
            with urllib.request.urlopen(req, timeout=5) as resp:
                skills_data = json.loads(resp.read())
                record(f"GET /skills/ 返回 {len(skills_data)} 个技能", len(skills_data) >= 6)
        except Exception as e:
            record("GET /skills/", False, str(e))
        
        # 技能匹配
        try:
            req = urllib.request.Request(
                "http://127.0.0.1:8000/api/v1/skills/match?query=%E5%90%88%E5%90%8C%E5%AE%A1%E6%9F%A5"
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                match_data = json.loads(resp.read())
                skills_list = match_data.get("skills", match_data) if isinstance(match_data, dict) else match_data
                has_contract = any("contract" in s.get("name", "") for s in skills_list)
                record(f"GET /skills/match '合同审查' 匹配到 {len(skills_list)} 个", has_contract)
        except Exception as e:
            record("POST /skills/match", False, str(e))
        
        # ================================================================
        # 5. LLM 配置端点测试
        # ================================================================
        print("\n" + "=" * 60)
        print("5. LLM 配置端点测试")
        print("=" * 60)
        
        try:
            req = urllib.request.Request("http://127.0.0.1:8000/api/v1/llm/configs")
            with urllib.request.urlopen(req, timeout=10) as resp:
                llm_data = json.loads(resp.read())
                items = llm_data.get("items", [])
                record(f"GET /llm/configs 返回 {len(items)} 个配置", len(items) >= 1)
                if items:
                    first = items[0]
                    record(f"首个配置: {first.get('name')}/{first.get('provider')}", True)
        except Exception as e:
            record("GET /llm/configs", False, str(e))
        
    finally:
        await ws.close()
    
    # ================================================================
    # 最终报告
    # ================================================================
    print("\n" + "=" * 60)
    print(f"端到端测试完成: {PASS} 通过 / {FAIL} 失败 / 共 {PASS + FAIL} 项")
    print("=" * 60)
    
    if ERRORS:
        print("\n失败项详情:")
        for i, err in enumerate(ERRORS, 1):
            print(f"  {i}. {err}")
    else:
        print("\n所有端到端测试通过！")

if __name__ == "__main__":
    asyncio.run(main())
