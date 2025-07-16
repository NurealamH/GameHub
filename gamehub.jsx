import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// --- Firebase Context ---
// Create a context to provide Firebase instances and user info throughout the app
const FirebaseContext = createContext(null);

// --- Global Variables (provided by Canvas environment) ---
// __app_id: The unique ID for this application instance.
// __firebase_config: Firebase configuration object as a JSON string.
// __initial_auth_token: Custom Firebase authentication token.

// Ensure these global variables are defined, providing fallbacks for local development
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Utility Components ---

// LoadingSpinner: A simple spinner component for loading states
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
  </div>
);

// Modal: A reusable modal component for messages or confirmations
const Modal = ({ isOpen, onClose, title, message, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-6 rounded-xl shadow-2xl max-w-sm w-full text-white border border-blue-400">
        <h3 className="text-2xl font-bold mb-4 text-center">{title}</h3>
        {message && <p className="text-center mb-6">{message}</p>}
        {children}
        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// --- Game Components ---

// TicTacToeSinglePlayer: A single-player Tic-Tac-Toe game against a simple AI.
const TicTacToeSinglePlayer = ({ onBack }) => {
  const [board, setBoard] = useState(Array(9).fill(null)); // Game board state
  const [xIsNext, setXIsNext] = useState(true); // Tracks whose turn it is (X or O)
  const [winner, setWinner] = useState(null); // Stores the winner (X, O, or Draw)
  const [modalOpen, setModalOpen] = useState(false); // State for modal visibility
  const [modalMessage, setModalMessage] = useState(''); // Message for the modal

  // Function to calculate the winner
  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6],           // Diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]; // Return 'X' or 'O'
      }
    }
    // Check for a draw
    if (squares.every(square => square !== null)) {
      return 'Draw';
    }
    return null; // No winner yet
  };

  // Handles a player's click on a square
  const handleClick = (i) => {
    if (winner || board[i]) { // If game is over or square is already filled, do nothing
      return;
    }
    const newBoard = board.slice(); // Create a copy of the board
    newBoard[i] = xIsNext ? 'X' : 'O'; // Place X or O
    setBoard(newBoard);
    setXIsNext(!xIsNext); // Toggle turn

    const currentWinner = calculateWinner(newBoard);
    if (currentWinner) {
      setWinner(currentWinner);
      setModalMessage(currentWinner === 'Draw' ? 'It\'s a Draw!' : `Winner: ${currentWinner}!`);
      setModalOpen(true);
    } else if (!xIsNext) { // If it was O's turn (computer's turn next)
      // Computer's turn (simple AI)
      setTimeout(() => {
        makeComputerMove(newBoard);
      }, 500); // Delay for better UX
    }
  };

  // Computer's move logic
  const makeComputerMove = (currentBoard) => {
    const availableMoves = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
    if (availableMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableMoves.length);
      const computerMoveIndex = availableMoves[randomIndex];
      const newBoard = currentBoard.slice();
      newBoard[computerMoveIndex] = 'O'; // Computer is always 'O'
      setBoard(newBoard);
      setXIsNext(true); // It's X's turn again

      const currentWinner = calculateWinner(newBoard);
      if (currentWinner) {
        setWinner(currentWinner);
        setModalMessage(currentWinner === 'Draw' ? 'It\'s a Draw!' : `Winner: ${currentWinner}!`);
        setModalOpen(true);
      }
    }
  };

  // Renders a single square on the board
  const renderSquare = (i) => (
    <button
      key={i} // Added key prop here
      className="w-24 h-24 bg-blue-500 hover:bg-blue-700 text-white text-5xl font-bold flex items-center justify-center rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105"
      onClick={() => handleClick(i)}
      disabled={board[i] !== null || winner !== null}
    >
      {board[i]}
    </button>
  );

  // Resets the game
  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setWinner(null);
    setModalOpen(false);
    setModalMessage('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4 font-inter">
      <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-lg">Tic-Tac-Toe (Single Player)</h2>

      {/* Game Status */}
      <div className="text-2xl font-semibold mb-6">
        {winner ? (winner === 'Draw' ? 'It\'s a Draw!' : `Winner: ${winner}!`) : `Next Player: ${xIsNext ? 'X' : 'O'}`}
      </div>

      {/* Game Board */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-gray-800 bg-opacity-70 rounded-xl shadow-xl border border-gray-700">
        {Array.from({ length: 9 }).map((_, i) => renderSquare(i))}
      </div>

      {/* Game Controls */}
      <div className="mt-8 flex space-x-4">
        <button
          onClick={resetGame}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          Reset Game
        </button>
        <button
          onClick={onBack}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          Back to Hub
        </button>
      </div>

      {/* Winner/Draw Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Game Over!" message={modalMessage}>
        <button
          onClick={() => { resetGame(); setModalOpen(false); }}
          className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          Play Again
        </button>
      </Modal>
    </div>
  );
};

// TicTacToeMultiplayer: A multiplayer Tic-Tac-Toe game using Firestore for real-time updates.
const TicTacToeMultiplayer = ({ onBack }) => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext); // Get Firebase instances and user info from context
  const [games, setGames] = useState([]); // List of available games
  const [currentGameId, setCurrentGameId] = useState(null); // ID of the current game the user is in
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X'); // 'X' or 'O'
  const [winner, setWinner] = useState(null);
  const [status, setStatus] = useState('waiting'); // Game status: waiting, inProgress, finished
  const [playerRole, setPlayerRole] = useState(null); // 'X' or 'O' for the current user in the game
  const [opponentId, setOpponentId] = useState(null); // ID of the opponent
  const [loading, setLoading] = useState(true); // Loading state for game data
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // Effect to fetch and listen to available games
  useEffect(() => {
    if (!db || !isAuthReady) return; // Wait for Firebase to be ready

    const gamesCollectionRef = collection(db, `artifacts/${appId}/public/data/ticTacToeGames`);
    const unsubscribe = onSnapshot(gamesCollectionRef, (snapshot) => {
      const gameList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGames(gameList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching games:", error);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [db, isAuthReady]);

  // Effect to listen to the current game's state
  useEffect(() => {
    if (!db || !currentGameId || !isAuthReady) return;

    const gameDocRef = doc(db, `artifacts/${appId}/public/data/ticTacToeGames`, currentGameId);
    const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const gameData = docSnap.data();
        setBoard(gameData.board);
        setCurrentPlayer(gameData.currentPlayer);
        setWinner(gameData.winner);
        setStatus(gameData.status);

        // Determine player role and opponent ID
        if (gameData.players.player1Id === userId) {
          setPlayerRole('X');
          setOpponentId(gameData.players.player2Id || null);
        } else if (gameData.players.player2Id === userId) {
          setPlayerRole('O');
          setOpponentId(gameData.players.player1Id || null);
        } else {
          // If the user is not one of the players, they are observing
          setPlayerRole(null);
          setOpponentId(null);
        }

        // Show winner/draw modal
        if (gameData.winner) {
          setModalTitle("Game Over!");
          setModalMessage(gameData.winner === 'Draw' ? 'It\'s a Draw!' : `Winner: ${gameData.winner}!`);
          setModalOpen(true);
        }
      } else {
        // Game no longer exists, reset state
        setCurrentGameId(null);
        setBoard(Array(9).fill(null));
        setCurrentPlayer('X');
        setWinner(null);
        setStatus('waiting');
        setPlayerRole(null);
        setOpponentId(null);
        setModalTitle("Game Ended");
        setModalMessage("The game you were in has ended or was deleted.");
        setModalOpen(true);
      }
    }, (error) => {
      console.error("Error listening to current game:", error);
    });

    return () => unsubscribe();
  }, [db, currentGameId, userId, isAuthReady]);

  // Function to calculate the winner (same as single player)
  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every(square => square !== null)) {
      return 'Draw';
    }
    return null;
  };

  // Creates a new game in Firestore
  const createNewGame = async () => {
    if (!db || !userId) return;
    setLoading(true);
    try {
      const gamesCollectionRef = collection(db, `artifacts/${appId}/public/data/ticTacToeGames`);
      const newGameRef = await addDoc(gamesCollectionRef, {
        players: { player1Id: userId, player2Id: null },
        board: Array(9).fill(null),
        currentPlayer: 'X',
        status: 'waiting',
        winner: null,
        createdAt: new Date(),
        lastMoveAt: new Date(),
      });
      setCurrentGameId(newGameRef.id);
      setLoading(false);
    } catch (e) {
      console.error("Error creating new game:", e);
      setLoading(false);
      setModalTitle("Error");
      setModalMessage("Failed to create a new game. Please try again.");
      setModalOpen(true);
    }
  };

  // Joins an existing game
  const joinGame = async (gameId, player1Id) => {
    if (!db || !userId || gameId === currentGameId) return; // Prevent joining own game or already joined
    if (player1Id === userId) {
      setModalTitle("Cannot Join");
      setModalMessage("You cannot join your own game. Please wait for an opponent or create a new game.");
      setModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const gameDocRef = doc(db, `artifacts/${appId}/public/data/ticTacToeGames`, gameId);
      await updateDoc(gameDocRef, {
        'players.player2Id': userId,
        status: 'inProgress',
        lastMoveAt: new Date(),
      });
      setCurrentGameId(gameId);
      setLoading(false);
    } catch (e) {
      console.error("Error joining game:", e);
      setLoading(false);
      setModalTitle("Error");
      setModalMessage("Failed to join the game. It might be full or no longer exists.");
      setModalOpen(true);
    }
  };

  // Makes a move in the current game
  const makeMove = async (i) => {
    if (!db || !currentGameId || winner || board[i] || status !== 'inProgress' || currentPlayer !== playerRole) {
      // Game not in progress, already won, square taken, or not current player's turn
      return;
    }

    const newBoard = board.slice();
    newBoard[i] = playerRole; // Use the player's assigned role (X or O)
    const newWinner = calculateWinner(newBoard);

    try {
      const gameDocRef = doc(db, `artifacts/${appId}/public/data/ticTacToeGames`, currentGameId);
      await updateDoc(gameDocRef, {
        board: newBoard,
        currentPlayer: playerRole === 'X' ? 'O' : 'X', // Toggle player
        winner: newWinner,
        status: newWinner ? 'finished' : 'inProgress', // Update status if game finished
        lastMoveAt: new Date(),
      });
    } catch (e) {
      console.error("Error making move:", e);
      setModalTitle("Error");
      setModalMessage("Failed to make move. Please check your connection.");
      setModalOpen(true);
    }
  };

  // Renders a single square
  const renderSquare = (i) => (
    <button
      key={i} // Added key prop here
      className={`w-24 h-24 text-5xl font-bold flex items-center justify-center rounded-lg shadow-md transition duration-200 ease-in-out transform
        ${board[i] === 'X' ? 'bg-red-500' : board[i] === 'O' ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}
        ${(winner || status !== 'inProgress' || currentPlayer !== playerRole || board[i]) ? 'cursor-not-allowed opacity-70' : 'hover:scale-105'}`
      }
      onClick={() => makeMove(i)}
      disabled={winner || status !== 'inProgress' || currentPlayer !== playerRole || board[i] !== null}
    >
      {board[i]}
    </button>
  );

  // Resets the current game (only if you are one of the players)
  const resetCurrentGame = async () => {
    if (!db || !currentGameId || !playerRole) return; // Only players can reset
    try {
      const gameDocRef = doc(db, `artifacts/${appId}/public/data/ticTacToeGames`, currentGameId);
      await updateDoc(gameDocRef, {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        status: 'inProgress', // Reset to inProgress
        lastMoveAt: new Date(),
      });
      setModalOpen(false); // Close modal after reset
    } catch (e) {
      console.error("Error resetting game:", e);
      setModalTitle("Error");
      setModalMessage("Failed to reset game. Please try again.");
      setModalOpen(true);
    }
  };

  // Leaves the current game
  const leaveGame = async () => {
    if (!db || !currentGameId) return;
    try {
      const gameDocRef = doc(db, `artifacts/${appId}/public/data/ticTacToeGames`, currentGameId);
      const gameSnap = await getDoc(gameDocRef);
      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        // If only one player is left, delete the game
        if (gameData.players.player1Id === userId && !gameData.players.player2Id) {
          await deleteDoc(gameDocRef);
        } else if (gameData.players.player1Id === userId) {
          // If player 1 leaves, promote player 2 to player 1
          await updateDoc(gameDocRef, {
            'players.player1Id': gameData.players.player2Id,
            'players.player2Id': null,
            status: 'waiting',
            winner: null,
          });
        } else if (gameData.players.player2Id === userId) {
          // If player 2 leaves, just remove player 2
          await updateDoc(gameDocRef, {
            'players.player2Id': null,
            status: 'waiting',
            winner: null,
          });
        }
      }
      setCurrentGameId(null);
      setBoard(Array(9).fill(null));
      setCurrentPlayer('X');
      setWinner(null);
      setStatus('waiting');
      setPlayerRole(null);
      setOpponentId(null);
      setModalOpen(false); // Close any open modals
    } catch (e) {
      console.error("Error leaving game:", e);
      setModalTitle("Error");
      setModalMessage("Failed to leave game. Please try again.");
      setModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4 font-inter">
        <LoadingSpinner />
        <p className="mt-4 text-xl">Loading games...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4 font-inter">
      <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-lg">Tic-Tac-Toe (Multiplayer)</h2>
      <p className="text-lg mb-4">Your User ID: <span className="font-bold text-yellow-300 break-all">{userId}</span></p>

      {/* Game Lobby / Current Game View */}
      {!currentGameId ? (
        // Game Lobby
        <div className="w-full max-w-2xl bg-gray-800 bg-opacity-70 p-6 rounded-xl shadow-xl border border-gray-700">
          <h3 className="text-2xl font-bold mb-4 text-center">Join or Create Game</h3>
          <button
            onClick={createNewGame}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg mb-4"
          >
            Create New Game
          </button>

          <h4 className="text-xl font-semibold mb-3">Available Games:</h4>
          {games.length === 0 && <p className="text-center text-gray-400">No games available. Create one!</p>}
          <ul className="space-y-3">
            {games.map((game) => (
              <li key={game.id} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg shadow-md">
                <span>
                  Game ID: <span className="font-mono text-sm text-yellow-300">{game.id.substring(0, 8)}...</span> <br />
                  Player 1: <span className="font-mono text-sm text-blue-300">{game.players.player1Id.substring(0, 8)}...</span> <br />
                  Status: <span className={`font-semibold ${game.status === 'waiting' ? 'text-yellow-400' : 'text-green-400'}`}>{game.status}</span>
                </span>
                {game.status === 'waiting' && game.players.player1Id !== userId && (
                  <button
                    onClick={() => joinGame(game.id, game.players.player1Id)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                  >
                    Join Game
                  </button>
                )}
                {game.players.player1Id === userId && (
                    <span className="text-sm text-gray-400">Waiting for opponent...</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // Current Game View
        <div className="w-full max-w-md bg-gray-800 bg-opacity-70 p-6 rounded-xl shadow-xl border border-gray-700">
          <h3 className="text-2xl font-bold mb-4 text-center">Current Game</h3>
          <p className="text-lg mb-2">Game ID: <span className="font-mono text-yellow-300 break-all">{currentGameId}</span></p>
          <p className="text-lg mb-2">Your Role: <span className="font-bold text-green-400">{playerRole || 'Observer'}</span></p>
          {opponentId && <p className="text-lg mb-4">Opponent: <span className="font-bold text-orange-400 break-all">{opponentId}</span></p>}
          {!opponentId && status === 'waiting' && <p className="text-lg mb-4 text-yellow-400">Waiting for opponent...</p>}

          {/* Game Status */}
          <div className="text-2xl font-semibold mb-6 text-center">
            {winner ? (winner === 'Draw' ? 'It\'s a Draw!' : `Winner: ${winner}!`) : `Next: ${currentPlayer}`}
          </div>

          {/* Game Board */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-gray-900 rounded-xl shadow-inner">
            {Array.from({ length: 9 }).map((_, i) => renderSquare(i))}
          </div>

          {/* Game Controls */}
          <div className="mt-8 flex flex-col space-y-4">
            {playerRole && ( // Only show reset if user is a player
              <button
                onClick={resetCurrentGame}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
              >
                Reset Game
              </button>
            )}
            <button
              onClick={leaveGame}
              className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
            >
              Leave Game
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      >
        Back to Hub
      </button>

      {/* Game Over/Error Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} message={modalMessage}>
        {winner && playerRole && ( // Only show play again if game finished and user was a player
          <button
            onClick={() => { resetCurrentGame(); setModalOpen(false); }}
            className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg mb-4"
          >
            Play Again
          </button>
        )}
      </Modal>
    </div>
  );
};

// NumberGuessingGame: A simple game where the user guesses a random number.
const NumberGuessingGame = ({ onBack }) => {
  const [targetNumber, setTargetNumber] = useState(null); // The number to guess
  const [guess, setGuess] = useState(''); // User's current guess
  const [message, setMessage] = useState(''); // Feedback message to the user
  const [attempts, setAttempts] = useState(0); // Number of attempts
  const [gameOver, setGameOver] = useState(false); // Game over state
  const [modalOpen, setModalOpen] = useState(false); // Modal for game over
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // Initializes a new game
  const startGame = () => {
    const newTarget = Math.floor(Math.random() * 100) + 1; // Number between 1 and 100
    setTargetNumber(newTarget);
    setGuess('');
    setMessage('Guess a number between 1 and 100!');
    setAttempts(0);
    setGameOver(false);
    setModalOpen(false);
  };

  // Start a new game when component mounts
  useEffect(() => {
    startGame();
  }, []);

  // Handles user's guess submission
  const handleGuess = () => {
    const numGuess = parseInt(guess, 10);
    if (isNaN(numGuess) || numGuess < 1 || numGuess > 100) {
      setMessage('Please enter a valid number between 1 and 100.');
      return;
    }

    setAttempts(attempts + 1);

    if (numGuess === targetNumber) {
      setMessage(`Congratulations! You guessed the number ${targetNumber} in ${attempts + 1} attempts!`);
      setGameOver(true);
      setModalTitle("Congratulations!");
      setModalMessage(`You guessed the number ${targetNumber} in ${attempts + 1} attempts!`);
      setModalOpen(true);
    } else if (numGuess < targetNumber) {
      setMessage('Too low! Try again.');
    } else {
      setMessage('Too high! Try again.');
    }
    setGuess(''); // Clear input after guess
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-4 font-inter">
      <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-lg">Number Guessing Game</h2>

      <div className="bg-gray-800 bg-opacity-70 p-8 rounded-xl shadow-xl border border-gray-700 max-w-md w-full text-center">
        <p className="text-xl mb-4">{message}</p>
        {!gameOver && (
          <>
            <input
              type="number"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Enter your guess"
              className="w-full p-3 mb-4 text-center text-gray-900 bg-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="100"
            />
            <button
              onClick={handleGuess}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg mb-4"
            >
              Guess
            </button>
          </>
        )}
        <p className="text-lg">Attempts: {attempts}</p>
        <button
          onClick={startGame}
          className="mt-6 bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg w-full"
        >
          Play Again
        </button>
      </div>

      <button
        onClick={onBack}
        className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      >
        Back to Hub
      </button>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} message={modalMessage}>
        <button
          onClick={() => { startGame(); setModalOpen(false); }}
          className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          Play Again
        </button>
      </Modal>
    </div>
  );
};

// RockPaperScissors: A simple game against the computer.
const RockPaperScissors = ({ onBack }) => {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [result, setResult] = useState('');
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const choices = ['rock', 'paper', 'scissors'];

  // Determines the winner of a round
  const determineWinner = (player, computer) => {
    if (player === computer) {
      return 'It\'s a tie!';
    }
    if (
      (player === 'rock' && computer === 'scissors') ||
      (player === 'paper' && computer === 'rock') ||
      (player === 'scissors' && computer === 'paper')
    ) {
      setScore(prev => ({ ...prev, player: prev.player + 1 }));
      return 'You win!';
    } else {
      setScore(prev => ({ ...prev, computer: prev.computer + 1 }));
      return 'Computer wins!';
    }
  };

  // Handles a player's choice
  const handlePlay = (choice) => {
    setPlayerChoice(choice);
    const randomComputerChoice = choices[Math.floor(Math.random() * choices.length)];
    setComputerChoice(randomComputerChoice);
    setResult(determineWinner(choice, randomComputerChoice));
  };

  // Resets the game score
  const resetGame = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult('');
    setScore({ player: 0, computer: 0 });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-800 to-teal-900 text-white p-4 font-inter">
      <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-lg">Rock, Paper, Scissors</h2>

      <div className="bg-gray-800 bg-opacity-70 p-8 rounded-xl shadow-xl border border-gray-700 max-w-md w-full text-center">
        <p className="text-xl mb-6">Make your choice:</p>
        <div className="flex justify-around mb-8">
          {choices.map((choice) => (
            <button
              key={choice} // Added key prop here
              onClick={() => handlePlay(choice)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg capitalize transition duration-300 ease-in-out transform hover:scale-110 shadow-lg"
            >
              {choice}
            </button>
          ))}
        </div>

        {playerChoice && (
          <div className="mb-6 text-lg">
            <p>You chose: <span className="font-bold text-yellow-300 capitalize">{playerChoice}</span></p>
            <p>Computer chose: <span className="font-bold text-red-300 capitalize">{computerChoice}</span></p>
            <p className="text-2xl font-bold mt-4">{result}</p>
          </div>
        )}

        <div className="text-xl font-semibold mb-6">
          Score: You {score.player} - {score.computer} Computer
        </div>

        <button
          onClick={resetGame}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg w-full mb-4"
        >
          Reset Score
        </button>
      </div>

      <button
        onClick={onBack}
        className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      >
        Back to Hub
      </button>
    </div>
  );
};

// MemoryCardGame: A simple memory matching game.
const MemoryCardGame = ({ onBack }) => {
  const initialCards = [
    { id: 1, value: 'A', matched: false, flipped: false },
    { id: 2, value: 'A', matched: false, flipped: false },
    { id: 3, value: 'B', matched: false, flipped: false },
    { id: 4, value: 'B', matched: false, flipped: false },
    { id: 5, value: 'C', matched: false, flipped: false },
    { id: 6, value: 'C', matched: false, flipped: false },
    { id: 7, value: 'D', matched: false, flipped: false },
    { id: 8, value: 'D', matched: false, flipped: false },
  ].sort(() => Math.random() - 0.5); // Shuffle cards

  const [cards, setCards] = useState(initialCards);
  const [flippedCards, setFlippedCards] = useState([]); // Stores IDs of currently flipped cards
  const [matchesFound, setMatchesFound] = useState(0); // Count of matched pairs
  const [moves, setMoves] = useState(0); // Number of moves
  const [gameOver, setGameOver] = useState(false); // Game over state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Resets the game
  const resetGame = () => {
    setCards(initialCards.sort(() => Math.random() - 0.5).map(card => ({ ...card, flipped: false, matched: false })));
    setFlippedCards([]);
    setMatchesFound(0);
    setMoves(0);
    setGameOver(false);
    setModalOpen(false);
  };

  // Handles card click
  const handleCardClick = (id) => {
    if (gameOver || flippedCards.length === 2) return; // Prevent clicks if game over or two cards already flipped

    setCards(prevCards =>
      prevCards.map(card =>
        card.id === id ? { ...card, flipped: true } : card
      )
    );

    setFlippedCards(prev => [...prev, id]);
  };

  // Effect to check for matches when two cards are flipped
  useEffect(() => {
    if (flippedCards.length === 2) {
      setMoves(prev => prev + 1);
      const [id1, id2] = flippedCards;
      const card1 = cards.find(card => card.id === id1);
      const card2 = cards.find(card => card.id === id2);

      if (card1.value === card2.value) {
        // Match found
        setMatchesFound(prev => prev + 1);
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === id1 || card.id === id2 ? { ...card, matched: true } : card
          )
        );
        setFlippedCards([]); // Clear flipped cards
      } else {
        // No match, flip back after a delay
        setTimeout(() => {
          setCards(prevCards =>
            prevCards.map(card =>
              card.id === id1 || card.id === id2 ? { ...card, flipped: false } : card
            )
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  }, [flippedCards, cards]);

  // Effect to check for game over
  useEffect(() => {
    if (matchesFound === initialCards.length / 2 && initialCards.length > 0) {
      setGameOver(true);
      setModalMessage(`Congratulations! You matched all pairs in ${moves} moves!`);
      setModalOpen(true);
    }
  }, [matchesFound, moves, initialCards.length]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-800 to-red-900 text-white p-4 font-inter">
      <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-lg">Memory Card Game</h2>

      <div className="bg-gray-800 bg-opacity-70 p-8 rounded-xl shadow-xl border border-gray-700 max-w-xl w-full text-center">
        <div className="text-xl mb-6">
          Moves: <span className="font-bold">{moves}</span> | Matches: <span className="font-bold">{matchesFound}</span>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {cards.map(card => (
            <div
              key={card.id} // Added key prop here
              className={`relative w-20 h-28 rounded-lg shadow-lg cursor-pointer transform transition-all duration-300 ease-in-out
                ${card.flipped || card.matched ? 'rotate-y-180' : ''}
                ${card.matched ? 'opacity-50 pointer-events-none' : 'hover:scale-105'}`
              }
              onClick={() => !card.matched && !card.flipped && handleCardClick(card.id)}
            >
              <div className="absolute inset-0 backface-hidden bg-blue-600 rounded-lg flex items-center justify-center text-5xl font-extrabold text-white border-2 border-blue-400">
                ?
              </div>
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-green-600 rounded-lg flex items-center justify-center text-5xl font-extrabold text-white border-2 border-green-400">
                {card.value}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={resetGame}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg w-full"
        >
          Reset Game
        </button>
      </div>

      <button
        onClick={onBack}
        className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      >
        Back to Hub
      </button>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Game Over!" message={modalMessage}>
        <button
          onClick={() => { resetGame(); setModalOpen(false); }}
          className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          Play Again
        </button>
      </Modal>
    </div>
  );
};

// SimpleClickerGame: A game where you click a button to increase a score.
const SimpleClickerGame = ({ onBack }) => {
  const [score, setScore] = useState(0);
  const [clickPower, setClickPower] = useState(1);
  const [upgradeCost, setUpgradeCost] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // Handles a click on the main button
  const handleClick = () => {
    setScore(prevScore => prevScore + clickPower);
  };

  // Handles upgrading click power
  const handleUpgrade = () => {
    if (score >= upgradeCost) {
      setScore(prevScore => prevScore - upgradeCost);
      setClickPower(prevPower => prevPower + 1);
      setUpgradeCost(prevCost => Math.floor(prevCost * 1.5)); // Increase cost for next upgrade
      setModalTitle("Upgrade Successful!");
      setModalMessage(`Your click power is now ${clickPower + 1}!`);
      setModalOpen(true);
    } else {
      setModalTitle("Not Enough Score!");
      setModalMessage(`You need ${upgradeCost - score} more score to upgrade.`);
      setModalOpen(true);
    }
  };

  // Resets the game
  const resetGame = () => {
    setScore(0);
    setClickPower(1);
    setUpgradeCost(10);
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-yellow-700 to-orange-800 text-white p-4 font-inter">
      <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-lg">Simple Clicker Game</h2>

      <div className="bg-gray-800 bg-opacity-70 p-8 rounded-xl shadow-xl border border-gray-700 max-w-md w-full text-center">
        <p className="text-5xl font-bold mb-6">Score: {score}</p>
        <p className="text-xl mb-6">Click Power: {clickPower}</p>

        <button
          onClick={handleClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg text-3xl mb-4"
        >
          Click Me!
        </button>

        <button
          onClick={handleUpgrade}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg mb-4"
        >
          Upgrade Click Power (Cost: {upgradeCost})
        </button>

        <button
          onClick={resetGame}
          className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          Reset Game
        </button>
      </div>

      <button
        onClick={onBack}
        className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      >
        Back to Hub
      </button>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} message={modalMessage} />
    </div>
  );
};

// ChatRoom: A simple multiplayer chat room using Firestore.
const ChatRoom = ({ onBack }) => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = React.useRef(null); // Ref for auto-scrolling chat

  // Effect to listen for new messages
  useEffect(() => {
    if (!db || !isAuthReady) return;

    const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/chatMessages`);
    const unsubscribe = onSnapshot(messagesCollectionRef, (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort messages by timestamp to ensure correct order
      fetchedMessages.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(fetchedMessages);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, isAuthReady]);

  // Effect to scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Sends a new message to Firestore
  const sendMessage = async () => {
    if (!db || !userId || newMessage.trim() === '') return;

    try {
      const messagesCollectionRef = collection(db, `artifacts/${appId}/public/data/chatMessages`);
      await addDoc(messagesCollectionRef, {
        userId: userId,
        text: newMessage,
        timestamp: Date.now(), // Use client-side timestamp for sorting
      });
      setNewMessage(''); // Clear input field
    } catch (e) {
      console.error("Error sending message:", e);
      // Could add a modal here for error feedback
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4 font-inter">
        <LoadingSpinner />
        <p className="mt-4 text-xl">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-4 font-inter">
      <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-lg">Multiplayer Chat Room</h2>
      <p className="text-lg mb-4">Your User ID: <span className="font-bold text-yellow-300 break-all">{userId}</span></p>

      <div className="bg-gray-800 bg-opacity-70 p-6 rounded-xl shadow-xl border border-gray-700 max-w-2xl w-full flex flex-col h-[60vh]">
        {/* Message Display Area */}
        <div className="flex-grow overflow-y-auto mb-4 p-2 rounded-lg bg-gray-900 border border-gray-700 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 mt-4">No messages yet. Start chatting!</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`mb-2 p-2 rounded-lg ${msg.userId === userId ? 'bg-blue-600 self-end ml-auto' : 'bg-gray-700 self-start mr-auto'} max-w-[80%]`}>
                <p className="text-sm font-semibold text-gray-200 break-all">{msg.userId.substring(0, 8)}...:</p>
                <p className="text-base">{msg.text}</p>
                <p className="text-xs text-gray-300 text-right mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} /> {/* For auto-scrolling */}
        </div>

        {/* Message Input */}
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-grow p-3 rounded-l-lg text-gray-900 bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-r-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
          >
            Send
          </button>
        </div>
      </div>

      <button
        onClick={onBack}
        className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
      >
        Back to Hub
      </button>
    </div>
  );
};

// GameCard: Component for displaying a single game in the hub.
const GameCard = ({ game, onClick }) => (
  <div
    className="bg-gray-800 bg-opacity-70 rounded-xl shadow-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer
               transform transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-2xl border border-gray-700"
    onClick={() => onClick(game.id)}
  >
    <div className="text-5xl mb-4">🎮</div> {/* Placeholder icon */}
    <h3 className="text-2xl font-bold mb-2 text-white">{game.name}</h3>
    <p className="text-gray-300 text-sm">{game.type}</p>
  </div>
);

// App: The main application component.
export default function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // Tracks if Firebase auth state is initialized
  const [currentPage, setCurrentPage] = useState('hub'); // State for navigation

  // Define the list of games
  const games = [
    { id: 'ticTacToeSingle', name: 'Tic-Tac-Toe', type: 'Single Player', component: TicTacToeSinglePlayer },
    { id: 'numberGuessing', name: 'Number Guessing', type: 'Single Player', component: NumberGuessingGame },
    { id: 'rockPaperScissors', name: 'Rock, Paper, Scissors', type: 'Single Player', component: RockPaperScissors },
    { id: 'memoryCard', name: 'Memory Cards', type: 'Single Player', component: MemoryCardGame },
    { id: 'clickerGame', name: 'Simple Clicker', type: 'Single Player', component: SimpleClickerGame },
    { id: 'ticTacToeMulti', name: 'Tic-Tac-Toe', type: 'Multiplayer', component: TicTacToeMultiplayer },
    { id: 'chatRoom', name: 'Chat Room', type: 'Multiplayer', component: ChatRoom },
    // Add more games here following the same structure
    // { id: 'connectFour', name: 'Connect Four', type: 'Multiplayer', component: ConnectFourGame },
    // { id: 'wordGuessing', name: 'Word Guessing', type: 'Multiplayer', component: WordGuessingGame },
    // { id: 'collaborativeWhiteboard', name: 'Collaborative Whiteboard', type: 'Multiplayer', component: CollaborativeWhiteboard },
  ];

  // Initialize Firebase and set up authentication listener
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);

      setDb(firestore);
      setAuth(authInstance);

      // Listen for authentication state changes
      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          // User is signed in.
          setUserId(user.uid);
        } else {
          // No user is signed in. Sign in anonymously if no custom token provided.
          if (!initialAuthToken) {
            try {
              const anonymousUser = await signInAnonymously(authInstance);
              setUserId(anonymousUser.user.uid);
            } catch (error) {
              console.error("Error signing in anonymously:", error);
              // Handle anonymous sign-in error gracefully
            }
          }
        }
        setIsAuthReady(true); // Authentication state has been checked
      });

      // If a custom auth token is provided, sign in with it immediately
      if (initialAuthToken) {
        signInWithCustomToken(authInstance, initialAuthToken)
          .catch((error) => {
            console.error("Error signing in with custom token:", error);
            // Fallback to anonymous or handle specific error
          });
      }

      return () => unsubscribe(); // Clean up auth listener on unmount
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      // Display an error message to the user if Firebase initialization fails
      setIsAuthReady(true); // Mark as ready even on error to avoid infinite loading
    }
  }, []); // Empty dependency array means this runs once on mount

  // Show loading spinner until authentication is ready
  if (!isAuthReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 font-inter">
        <LoadingSpinner />
        <p className="mt-4 text-xl">Initializing Game Hub...</p>
      </div>
    );
  }

  // Render the current page based on navigation state
  const renderPage = () => {
    switch (currentPage) {
      case 'hub':
        return (
          <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 font-inter">
            <h1 className="text-5xl font-extrabold mb-12 text-center drop-shadow-lg">Welcome to the Game Hub!</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
              {games.map((game) => (
                <GameCard key={game.id} game={game} onClick={setCurrentPage} />
              ))}
            </div>
          </div>
        );
      default:
        // Find the component for the current game
        const CurrentGameComponent = games.find(game => game.id === currentPage)?.component;
        if (CurrentGameComponent) {
          return <CurrentGameComponent onBack={() => setCurrentPage('hub')} />;
        }
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 font-inter">
            <h2 className="text-3xl font-bold mb-4">Game Not Found!</h2>
            <button
              onClick={() => setCurrentPage('hub')}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
            >
              Back to Hub
            </button>
          </div>
        );
    }
  };

  return (
    // Provide Firebase instances and user info to all children components via context
    <FirebaseContext.Provider value={{ db, auth, userId, isAuthReady }}>
      {renderPage()}
    </FirebaseContext.Provider>
  );
}
