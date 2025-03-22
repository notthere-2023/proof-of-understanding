import React from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { CSSProperties } from "react";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const defaultClient = React.useMemo(() => {
        return new ccc.ClientPublicTestnet();  // 默认使用测试网
    }, []);
    
    return (
        <ccc.Provider
            connectorProps={{
                style: {
                    "--background": "#ffffff",
                    "--divider": "rgba(0, 0, 0, 0.1)",
                    "--btn-primary": "#1890ff",
                    "--btn-primary-hover": "#40a9ff",
                    "--btn-secondary": "#f0f0f0",
                    "--btn-secondary-hover": "#d9d9d9",
                    "--icon-primary": "#000000",
                    "--icon-secondary": "rgba(0, 0, 0, 0.45)",
                    color: "#000000",
                    "--tip-color": "#666666",
                } as CSSProperties,
            }}
            defaultClient={defaultClient}
            clientOptions={[
                {
                    name: "CKB Testnet",
                    client: new ccc.ClientPublicTestnet(),
                },
                {
                    name: "CKB Mainnet",
                    client: new ccc.ClientPublicMainnet(),
                },
            ]}
        >
            {children}
        </ccc.Provider>
    );
}