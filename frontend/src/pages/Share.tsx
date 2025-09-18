import React from "react";
import { useParams } from "react-router-dom";

const Share: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    return <h2 className="p-8">Shared Board – Token: {token}</h2>;
};

export default Share;
