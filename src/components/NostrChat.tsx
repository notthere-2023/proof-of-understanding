import React, { useState, useEffect, useCallback, memo } from 'react';
import { Button, Input, message, Space } from 'antd';
import { ccc } from '@ckb-ccc/connector-react';

// State interfaces
interface UserState {
  pk: string;
  sk: string;
  name: string;
}

interface Message {
  content: {
    text: string;
    mode: 'normal' | 'proof';
  };
  sender: string;
  timestamp: number;
  isFromMe: boolean;
  receiver?: string;
}

interface NostrEvent {
  kind: number;
  pubkey: string;
  created_at: number;
  content: string;
  tags: string[][];
  id?: string;
  sig?: string;
}

interface WalletInfo {
  address: string;
  capacity: string;
}

interface MindfulnessState {
  isActive: boolean;
  remainingSeconds: number;
}

// 添加理解证明对话状态接口
interface ProofDialogState {
  isActive: boolean;
  stage: 'initial' | 'receiver_response' | 'sender_clarification' | 'completion';
  lastMessageId?: string;
  isCompleted: boolean;
}

// 修改为全局变量，避免重复加载
let nostrToolsLoadPromise: Promise<any> | null = null;

// 动态加载 nostr-tools
function loadNostrTools(): Promise<any> {
  if (nostrToolsLoadPromise) {
    return nostrToolsLoadPromise;
  }

  console.log('正在尝试加载 nostr-tools...');
  nostrToolsLoadPromise = new Promise((resolve) => {
    if (typeof (window as any).NostrTools !== 'undefined') {
      console.log('nostr-tools 已加载');
      resolve((window as any).NostrTools);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/nostr-tools@1.17.0/lib/nostr.bundle.js';
    script.onload = () => {
      console.log('nostr-tools 加载成功');
      resolve((window as any).NostrTools);
    };
    script.onerror = () => {
      console.log('加载 nostr-tools 失败');
      nostrToolsLoadPromise = null;
    };
    document.head.appendChild(script);
  });

  return nostrToolsLoadPromise;
}

const NostrChat: React.FC = () => {
  const { open, wallet, disconnect } = ccc.useCcc();
  const signer = ccc.useSigner();
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

  const [user, setUser] = useState<UserState>({
    sk: '',
    pk: '',
    name: '发送者'
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [NostrTools, setNostrTools] = useState<any>(null);
  const [relay, setRelay] = useState<any>(null);
  const [normalMessage, setNormalMessage] = useState('');
  const [proofMessage, setProofMessage] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');

  // 添加重连相关的状态
  const [isConnecting, setIsConnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds

  // 添加正念练习状态
  const [mindfulness, setMindfulness] = useState<MindfulnessState>({
    isActive: false,
    remainingSeconds: 300 // 5分钟 = 300秒
  });

  // 添加关闭对话的状态和函数
  const [isProofDialogOpen, setIsProofDialogOpen] = useState(true);

  // 添加理解证明对话状态
  const [proofDialog, setProofDialog] = useState<ProofDialogState>({
    isActive: false,
    stage: 'initial',
    isCompleted: false
  });

  const handleCloseProofDialog = () => {
    // 重置理解证明对话状态
    setProofDialog({
      isActive: false,
      stage: 'initial',
      isCompleted: false // 不标记为已完成，只是结束当前对话
    });
    
    // 清除消息输入框
    setProofMessage('');
    
    // 显示提示
    message.info('已退出当前对话，可以开始新的对话');
  };

  const connectToRelay = useCallback(async () => {
    if (!relay || isConnecting) return;

    try {
      setIsConnecting(true);
      await relay.connect();
      console.log('已连接到中继服务器');
      setReconnectAttempts(0);
    } catch (error) {
      console.error('连接中继服务器失败:', error);
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectToRelay();
        }, reconnectDelay);
      } else {
        message.error('无法连接到中继服务器，请检查网络连接后重试');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [relay, isConnecting, reconnectAttempts]);

  // 监听中继服务器状态
  useEffect(() => {
    if (!relay) return;

    const handleConnect = () => {
      console.log('已连接到中继服务器');
      setReconnectAttempts(0);
    };

    const handleDisconnect = () => {
      console.log('与中继服务器断开连接');
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectToRelay();
        }, reconnectDelay);
      }
    };

    const handleError = (error: any) => {
      console.error('中继服务器错误:', error);
    };

    relay.on('connect', handleConnect);
    relay.on('disconnect', handleDisconnect);
    relay.on('error', handleError);

    // 初始连接
    connectToRelay();

    return () => {
      relay.off('connect', handleConnect);
      relay.off('disconnect', handleDisconnect);
      relay.off('error', handleError);
    };
  }, [relay, connectToRelay]);

  useEffect(() => {
    loadNostrTools().then(tools => {
      if (!tools) return;
      
      setNostrTools(tools);
      const relayInstance = tools.relayInit('wss://relay.damus.io');
      setRelay(relayInstance);
      
      relayInstance.on('connect', () => {
        console.log('已连接到中继服务器');
        message.success('已连接到中继服务器');
        relayInstance.connected = true;
      });
      
      relayInstance.on('error', (err: Error) => {
        console.error('中继服务器错误:', err);
        message.error(`连接错误: ${err.message}`);
        relayInstance.connected = false;
      });

      relayInstance.on('disconnect', () => {
        console.log('与中继服务器断开连接');
        message.warning('与中继服务器断开连接');
        relayInstance.connected = false;
      });
      
      relayInstance.connect().catch((err: Error) => {
        console.error('连接失败:', err);
        message.error(`连接失败: ${err.message}`);
        relayInstance.connected = false;
      });

      return () => {
        try {
          relayInstance.close();
        } catch (err) {
          console.error('关闭连接失败:', err);
        }
      };
    }).catch(err => {
      console.error('加载 nostr-tools 失败:', err);
      message.error('加载 nostr-tools 失败');
    });
  }, []); // 只在组件首次加载时执行

  useEffect(() => {
    if (signer) {
      fetchWalletInfo();
    } else {
      setWalletInfo(null);
    }
  }, [signer]);

  const fetchWalletInfo = async () => {
    if (!signer) return;
    
    try {
      const address = await signer.getRecommendedAddress();
      if (!address) {
        message.warning('无法获取钱包地址');
        return;
      }

      const capacity = await signer.getBalance();
      
      setWalletInfo({
        address,
        capacity: ccc.fixedPointToString(capacity)
      });
      message.success('已成功连接到 CKB 钱包');
    } catch (error) {
      console.error('获取钱包信息失败:', error);
      message.error('获取钱包信息失败，请重试');
    }
  };

  const handleConnectWallet = async () => {
    try {
      await open();
      message.success('正在连接 CKB 钱包...');
    } catch (error) {
      console.error('连接钱包失败:', error);
      message.error('连接 CKB 钱包失败，请重试');
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      await disconnect();
      setWalletInfo(null);
      message.success('已断开 CKB 钱包连接');
    } catch (error) {
      console.error('断开钱包连接失败:', error);
      message.error('断开 CKB 钱包连接失败，请重试');
    }
  };

  const initializeUser = async () => {
    if (!NostrTools) return;

    // 清除之前的消息历史
    setMessages([]);
    
    // 重置理解证明对话状态
    setProofDialog({
      isActive: false,
      stage: 'initial',
      isCompleted: false
    });
    
    // 清除消息输入框
    setNormalMessage('');
    setProofMessage('');

    const sk = NostrTools.generatePrivateKey();
    const pk = NostrTools.getPublicKey(sk);
    const npub = NostrTools.nip19.npubEncode(pk);

    const newUser = {
      sk,
      pk,
      name: '发送者'
    } as UserState;

    setUser(newUser);
    message.info(`你的 Nostr 地址: ${npub}`);
  };

  // 修改消息订阅逻辑
  useEffect(() => {
    if (!NostrTools || !relay || !user.pk) return;

    // 获取当前用户参与的所有对话的订阅
    const sub = relay.sub([
      // 发给当前用户的消息
      { kinds: [1], '#p': [user.pk] },
      // 当前用户发出的消息
      { kinds: [1], authors: [user.pk] }
    ]);

    const processedEvents = new Set();

    sub.on('event', (event: any) => {
      try {
        if (processedEvents.has(event.id)) {
          return;
        }
        processedEvents.add(event.id);

        const parsedContent = JSON.parse(event.content);
        const isFromMe = event.pubkey === user.pk;
        
        // 获取接收者
        const receiver = event.tags.find((tag: string[]) => tag[0] === 'p')?.[1];
        
        // 如果消息不是来自当前用户，也不是发给当前用户的，则忽略
        if (!isFromMe && receiver !== user.pk) {
          return;
        }

        setMessages(prev => {
          const exists = prev.some(msg => 
            msg.timestamp === event.created_at && 
            msg.content.text === parsedContent.text
          );
          
          if (exists) return prev;

          const newMessage: Message = {
            content: parsedContent,
            sender: isFromMe ? '我' : NostrTools.nip19.npubEncode(event.pubkey),
            receiver: receiver ? NostrTools.nip19.npubEncode(receiver) : undefined,
            timestamp: event.created_at,
            isFromMe
          };
          
          // 如果是理解证明消息，更新对话状态
          if (parsedContent.mode === 'proof') {
            const proofMessages = [...prev, newMessage].filter(m => m.content.mode === 'proof');
            const firstProofMessage = proofMessages[0];
            
            // 判断是否是接收者的回复
            if (!isFromMe && firstProofMessage?.isFromMe) {
              // 如果是接收者的回复消息
              if (parsedContent.text.startsWith('提问：') || parsedContent.text.startsWith('复述：')) {
                setProofDialog(prev => ({
                  ...prev,
                  isActive: true,
                  stage: 'sender_clarification'
                }));
              }
            } else if (isFromMe && !firstProofMessage?.isFromMe) {
              // 如果是发起者的回复消息
              if (parsedContent.text.startsWith('澄清：')) {
                setProofDialog(prev => ({
                  ...prev,
                  isActive: true,
                  stage: 'receiver_response'
                }));
              }
            }
          }
          
          return [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp);
        });
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    });

    return () => {
      if (sub) {
        try {
          sub.unsub();
        } catch (err) {
          console.error('取消订阅失败:', err);
        }
      }
    };
  }, [NostrTools, relay, user.pk]);

  const handleSendMessage = async (mode: 'normal' | 'proof') => {
    if (!user.pk || !user.sk) {
      message.warning('请先初始化 Nostr 账号');
      return false;
    }

    if (!relay || !relay.connected) {
      message.warning('正在尝试重新连接到中继服务器...');
      await connectToRelay();
      if (!relay.connected) {
        message.error('中继服务器未连接，请稍后重试');
        return false;
      }
    }

    if (!receiverAddress) {
      message.warning('请填写接收者地址');
      return false;
    }

    const messageText = mode === 'normal' ? normalMessage : proofMessage;
    if (!messageText.trim()) {
      message.warning('请填写消息内容');
      return false;
    }

    const messageContent = {
      text: messageText,
      mode,
      stage: mode === 'proof' ? proofDialog.stage : undefined
    };

    try {
      let pubkey = receiverAddress;
      if (receiverAddress.startsWith('npub')) {
        const { type, data } = NostrTools.nip19.decode(receiverAddress);
        if (type === 'npub') {
          pubkey = data;
        } else {
          message.error('无效的 Nostr 地址格式');
          return false;
        }
      }

      const newMessage: Message = {
        content: messageContent,
        sender: '我',
        receiver: receiverAddress,
        timestamp: Math.floor(Date.now() / 1000),
        isFromMe: true
      };

      const event: NostrEvent = {
        kind: 1,
        pubkey: user.pk,
        created_at: newMessage.timestamp,
        content: JSON.stringify(messageContent),
        tags: [['p', pubkey]]
      };

      event.id = NostrTools.getEventHash(event);
      event.sig = NostrTools.getSignature(event, user.sk);

      console.log('正在发送消息...', event);

      // 增加重试逻辑
      let retryCount = 0;
      const maxRetries = 3;
      const publishWithRetry = async (): Promise<boolean> => {
        try {
          const publishPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('发送超时'));
            }, 10000);

            relay.publish(event)
              .then(() => {
                clearTimeout(timeout);
                resolve(true);
              })
              .catch((err: Error) => {
                clearTimeout(timeout);
                reject(err);
              });
          });

          await publishPromise;
          console.log('消息发送成功');
          setMessages(prev => [...prev, newMessage]);

          // 更新理解证明对话状态
          if (mode === 'proof') {
            if (proofDialog.stage === 'initial') {
              setProofDialog(prev => ({
                ...prev,
                stage: 'receiver_response',
                lastMessageId: event.id
              }));
            } else if (proofDialog.stage === 'sender_clarification') {
              setProofDialog(prev => ({
                ...prev,
                stage: 'receiver_response',
                lastMessageId: event.id
              }));
            }
          }

          return true;
        } catch (error) {
          console.error(`发送失败 (尝试 ${retryCount + 1}/${maxRetries}):`, error);
          if (retryCount < maxRetries - 1) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            return publishWithRetry();
          }
          throw error;
        }
      };

      await publishWithRetry();
      return true;
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送失败，请稍后重试');
      return false;
    }
  };

  // 修改 handleSendNormalMessage 函数
  const handleSendNormalMessage = useCallback(async () => {
    if (!normalMessage.trim()) {
      message.warning('请填写消息内容');
      return;
    }

    try {
      const success = await handleSendMessage('normal');
      if (success) {
        setNormalMessage('');
      }
    } catch (error) {
      console.error('发送普通消息失败:', error);
      message.error('发送失败，请稍后重试');
    }
  }, [normalMessage, handleSendMessage, setNormalMessage]);

  // 添加正念练习的计时器效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mindfulness.isActive && mindfulness.remainingSeconds > 0) {
      timer = setInterval(() => {
        setMindfulness(prev => ({
          ...prev,
          remainingSeconds: prev.remainingSeconds - 1
        }));
      }, 1000);
    } else if (mindfulness.remainingSeconds === 0) {
      setMindfulness(prev => ({
        ...prev,
        isActive: false
      }));
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [mindfulness.isActive, mindfulness.remainingSeconds]);

  // 修改正念练习处理函数
  const handleMindfulnessPractice = () => {
    setMindfulness({
      isActive: true,
      remainingSeconds: 300
    });
  };

  // 添加结束正念练习的函数
  const handleEndMindfulness = () => {
    setMindfulness({
      isActive: false,
      remainingSeconds: 300
    });
  };

  // 修改 handleProofCompletion 函数
  const handleProofCompletion = () => {
    setProofDialog(prev => ({
      ...prev,
      stage: 'completion',
      isCompleted: true
    }));
    
    // 清除消息输入框
    setProofMessage('');
    
    // 显示完成提示
    message.success('理解证明对话已完成！');
  };

  // 添加处理 Mint DOB 的函数
  const handleMintDOB = async () => {
    // TODO: 实现 Mint DOB 的逻辑
    message.info('Mint DOB 功能即将推出');
  };

  // 修改消息渲染函数
  const renderMessage = (msg: Message, index: number, allMessages: Message[], mode: 'normal' | 'proof') => {
    const messageText = msg.content?.text || '';
    
    // 渲染消息的基本结构
    const renderMessageBase = () => (
      <div key={index} style={{ 
        marginBottom: '12px',
        padding: '12px',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        fontSize: '14px'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          color: '#666'
        }}>
          <div>
            <strong>发送者:</strong> {msg.sender}
            {msg.receiver && (
              <>
                <strong style={{ marginLeft: '12px' }}>接收者:</strong> {msg.receiver}
              </>
            )}
            {msg.content?.mode === 'proof' && ' (理解证明)'}
          </div>
          <span style={{ fontSize: '13px' }}>{new Date(msg.timestamp * 1000).toLocaleString()}</span>
        </div>
        <div style={{ 
          color: '#333',
          background: '#f9f9f9',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #f0f0f0',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {messageText}
        </div>
        
        {mode === 'proof' && renderProofButtons(msg, allMessages)}
      </div>
    );

    // 渲染理解证明按钮
    const renderProofButtons = (msg: Message, allMessages: Message[]) => {
      // 获取当前轮次的理解证明消息
      const currentProofMessages = allMessages.filter((message: Message) => 
        message.content?.mode === 'proof'
      );
      
      // 找到第一条理解证明消息
      const firstProofMessage = currentProofMessages[0];
      if (!firstProofMessage) return null;

      // 判断当前用户是否是发起者
      const isCurrentUserInitiator = firstProofMessage?.isFromMe;
      
      // 判断当前消息是否来自发起者
      const isFromInitiator = msg.isFromMe === firstProofMessage?.isFromMe;
      
      // 判断是否应该显示接收者按钮
      const shouldShowReceiverButtons = !isCurrentUserInitiator && // 当前用户不是发起者
        isFromInitiator && // 当前消息来自发起者
        !proofDialog.isCompleted && // 对话未完成
        !msg.isFromMe; // 当前消息不是自己发送的
      
      // 判断是否应该显示发起者按钮
      const shouldShowInitiatorButtons = isCurrentUserInitiator && // 当前用户是发起者
        !isFromInitiator && // 消息来自接收者
        !proofDialog.isCompleted && // 对话未完成
        !msg.isFromMe && // 当前消息不是自己发送的
        (messageText.startsWith('提问：') || messageText.startsWith('复述：')); // 消息是提问或复述

      return (
        <>
          {/* 接收者的按钮 */}
          {shouldShowReceiverButtons && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '12px',
              justifyContent: 'flex-end'
            }}>
              <Button
                onClick={() => {
                  setProofMessage('提问：');
                  setProofDialog(prev => ({
                    ...prev,
                    isActive: true,
                    stage: 'receiver_response'
                  }));
                }}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#7c3aed';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#8b5cf6';
                }}
              >
                进行提问
              </Button>
              <Button
                onClick={() => {
                  setProofMessage('复述：');
                  setProofDialog(prev => ({
                    ...prev,
                    isActive: true,
                    stage: 'receiver_response'
                  }));
                }}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                }}
              >
                开始复述
              </Button>
            </div>
          )}
          
          {/* 发起者的按钮 */}
          {shouldShowInitiatorButtons && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '12px',
              justifyContent: 'flex-end'
            }}>
              <Button
                onClick={() => {
                  setProofMessage('澄清：');
                  setProofDialog(prev => ({
                    ...prev,
                    isActive: true,
                    stage: 'sender_clarification'
                  }));
                }}
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#d97706';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                }}
              >
                需要澄清
              </Button>
              {messageText.startsWith('复述：') && (
                <Button
                  onClick={handleProofCompletion}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#10b981';
                  }}
                >
                  确认理解
                </Button>
              )}
            </div>
          )}
        </>
      );
    };

    return renderMessageBase();
  };

  // 修改消息历史渲染函数
  const renderMessageHistory = (messages: Message[], mode: 'normal' | 'proof') => {
    return messages
      .filter(msg => msg.content?.mode === mode)
      .map((msg, index, filteredMessages) => renderMessage(msg, index, messages, mode));
  };

  // 修改总消息历史渲染
  const renderAllMessageHistory = (messages: Message[]) => {
    return messages.map((msg, index) => {
      const mode = msg.content?.mode || 'normal';
      return renderMessage(msg, index, messages, mode);
    });
  };

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '40px auto', 
      padding: '0 20px'
    }}>
      {/* 应用标题和引言 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '600',
          color: '#1a1a1a',
          marginBottom: '24px'
        }}>
          理解证明
        </h1>
        <div style={{
          fontSize: '16px',
          color: '#666',
          lineHeight: '1.8',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '24px',
          background: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #eaeaea',
          fontStyle: 'italic'
        }}>
          <p style={{ marginBottom: '12px' }}>"我该怎么做呢？"小王子问。</p>
          <p>"你要非常有耐心。"狐狸说，"首先，你要坐得离我稍远一点，就像这样，坐在草地上。我会偷偷地看你，你不要说话。语言是误解的源头。但是，你每天都可以坐得离我更近一点......"</p>
        </div>
      </div>

      {/* 钱包连接区域 */}
      <div style={{ 
        marginBottom: '32px',
        padding: '24px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid #f0f0f0'
      }}>
        <Space size="middle">
          <Button 
            onClick={handleConnectWallet} 
            disabled={!!walletInfo}
            type="primary"
            size="large"
          >
            连接钱包
          </Button>
          <Button 
            onClick={handleDisconnectWallet} 
            disabled={!walletInfo}
            size="large"
          >
            断开钱包
          </Button>
          <Button 
            onClick={initializeUser} 
            disabled={!NostrTools || !!user.pk}
            type="primary"
            size="large"
          >
            初始化 Nostr 账号
            </Button>
        </Space>
        {walletInfo && (
          <div style={{ 
            marginTop: '16px',
            fontSize: '14px',
            color: '#666',
            background: '#f9f9f9',
            padding: '12px',
            borderRadius: '8px'
          }}>
            <p style={{ margin: '4px 0' }}>钱包地址: {walletInfo.address}</p>
            <p style={{ margin: '4px 0' }}>余额: {walletInfo.capacity} CKB</p>
              </div>
        )}
        {user.pk && (
          <div style={{ 
            marginTop: '16px',
            fontSize: '14px',
            color: '#666',
            background: '#f9f9f9',
            padding: '12px',
            borderRadius: '8px'
          }}>
            <p style={{ margin: '4px 0' }}>
              <strong>你的 Nostr 地址:</strong> {NostrTools?.nip19?.npubEncode(user.pk)}
            </p>
            </div>
          )}
        </div>

      {/* 接收者地址输入 */}
      <Input
        placeholder="输入接收者的 Nostr 地址（npub 或 hex 格式）"
        value={receiverAddress}
        onChange={e => setReceiverAddress(e.target.value)}
        style={{ 
          marginBottom: '32px',
          height: '48px',
          fontSize: '16px',
          borderRadius: '8px'
        }}
        size="large"
      />

      {/* 对话区域容器 */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '32px',
        marginBottom: '32px'
      }}>
        {/* 自由对话框 */}
        <div style={{ 
          padding: '24px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #f0f0f0',
          height: '600px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0',
            fontSize: '18px',
            fontWeight: 500,
            color: '#333'
          }}>自由对话</h3>

          {/* 自由对话历史 */}
          <div style={{ 
            flex: 1,
            height: '380px',
            overflowY: 'auto',
            marginBottom: '16px',
            background: '#f9f9f9',
            borderRadius: '8px',
            padding: '12px'
          }}>
            {renderMessageHistory(messages, 'normal')}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <Input.TextArea
              placeholder="输入自由对话内容"
              value={normalMessage}
              onChange={e => setNormalMessage(e.target.value)}
              onPressEnter={e => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSendNormalMessage();
                }
              }}
              rows={4}
              style={{ 
                marginBottom: '16px',
                borderRadius: '8px',
                resize: 'none',
                fontSize: '14px'
              }}
            />
            <Button 
              type="primary" 
              onClick={handleSendNormalMessage}
              disabled={!user.pk || !receiverAddress || !normalMessage.trim()}
              style={{ width: '100%', height: '40px' }}
              size="large"
            >
              发送
            </Button>
          </div>
        </div>

        {/* 理解证明对话框 */}
        <div style={{ 
          padding: '24px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #f0f0f0',
          height: '600px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              margin: 0,
              fontSize: '18px',
              fontWeight: 500,
              color: '#333'
            }}>理解证明</h3>
            
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <Button
                onClick={handleMindfulnessPractice}
                disabled={mindfulness.isActive}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#7c3aed';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#8b5cf6';
                }}
              >
                正念练习
              </Button>
              <Button
                onClick={handleCloseProofDialog}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                }}
              >
                退出对话
              </Button>
            </div>
          </div>

          {/* 理解证明历史 */}
          <div style={{ 
            flex: 1,
            height: '380px',
            overflowY: 'auto',
            marginBottom: '16px',
            background: '#f9f9f9',
            borderRadius: '8px',
            padding: '12px'
          }}>
            {proofDialog.isCompleted ? (
              <div style={{
                textAlign: 'center',
                padding: '32px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
              }}>
                <h4 style={{
                  fontSize: '20px',
                  color: '#10b981',
                  marginBottom: '16px'
                }}>
                  理解证明完成！
                </h4>
                <p style={{
                  color: '#666',
                  marginBottom: '24px'
                }}>
                  恭喜你完成了理解证明对话。现在你可以铸造 DOB 来记录这个时刻。
                </p>
                <Button
                  onClick={handleMintDOB}
                  type="primary"
                  size="large"
                  style={{
                    backgroundColor: '#10b981',
                    border: 'none'
                  }}
                >
                  铸造 DOB
                </Button>
              </div>
            ) : (
              renderMessageHistory(messages, 'proof')
            )}
          </div>

          {!proofDialog.isCompleted && (
            <div style={{ marginTop: 'auto' }}>
              <Input.TextArea
                placeholder="输入理解证明内容"
                value={proofMessage}
                onChange={e => setProofMessage(e.target.value)}
                onPressEnter={e => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage('proof');
                  }
                }}
                rows={4}
                style={{ 
                  marginBottom: '16px',
                  borderRadius: '8px',
                  resize: 'none',
                  fontSize: '14px'
                }}
              />
              <Button 
                type="primary" 
                onClick={() => handleSendMessage('proof')}
                disabled={!user.pk || !receiverAddress || !proofMessage.trim()}
                style={{ width: '100%', height: '40px' }}
                size="large"
              >
                发送
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 消息历史记录 */}
      <div style={{ 
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid #f0f0f0',
        padding: '24px',
        marginTop: '32px'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0',
          fontSize: '18px',
          fontWeight: 500,
          color: '#333',
          borderBottom: '1px solid #f0f0f0',
          paddingBottom: '16px'
        }}>消息历史</h3>
        <div style={{ 
          maxHeight: '500px', 
          overflowY: 'auto',
          padding: '4px'
        }}>
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#999',
              padding: '32px'
            }}>
              暂无消息
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {renderAllMessageHistory(messages)}
            </div>
          )}
        </div>
      </div>

      {/* 正念练习计时器弹窗 */}
      {mindfulness.isActive && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            padding: '32px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <p style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              没有通往和平的道路，和平是道路。
            </p>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#1890ff',
              marginBottom: '32px'
            }}>
              {Math.floor(mindfulness.remainingSeconds / 60)}:
              {(mindfulness.remainingSeconds % 60).toString().padStart(2, '0')}
            </div>
            <Button 
              onClick={handleEndMindfulness}
              size="large"
              style={{
                width: '200px'
              }}
            >
              结束练习
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NostrChat; 