import React from "react";
import { useParams } from "react-router-dom";

const Board: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <h2 className="p-8">Board Page – Board ID: {id}</h2>;
};

export default Board;
