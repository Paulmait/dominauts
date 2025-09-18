// Supabase Edge Function: validate-move
// Server-side move validation to prevent cheating

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface MoveRequest {
  gameId: string;
  userId: string;
  domino: {
    left: number;
    right: number;
  };
  position: {
    side: 'left' | 'right';
    orientation?: 'horizontal' | 'vertical';
  };
}

interface GameState {
  id: string;
  board: any[];
  players: string[];
  current_player: string;
  mode: string;
  scores: Record<string, number>;
  player_hands: Record<string, any[]>;
  left_end: number;
  right_end: number;
}

// Validate domino placement according to game rules
function isValidMove(
  gameState: GameState,
  domino: any,
  position: any,
  playerId: string
): { valid: boolean; reason?: string } {

  // Check if it's the player's turn
  if (gameState.current_player !== playerId) {
    return { valid: false, reason: "Not your turn" };
  }

  // Check if player has this domino
  const playerHand = gameState.player_hands[playerId];
  const hasDomino = playerHand?.some((d: any) =>
    (d.left === domino.left && d.right === domino.right) ||
    (d.left === domino.right && d.right === domino.left)
  );

  if (!hasDomino) {
    return { valid: false, reason: "You don't have this domino" };
  }

  // First move - any domino is valid
  if (gameState.board.length === 0) {
    return { valid: true };
  }

  // Check if domino matches the end
  const valueToMatch = position.side === 'left' ? gameState.left_end : gameState.right_end;

  if (domino.left !== valueToMatch && domino.right !== valueToMatch) {
    return { valid: false, reason: "Domino doesn't match the board end" };
  }

  return { valid: true };
}

// Calculate score based on game mode
function calculateScore(gameState: GameState, domino: any, position: any): number {
  let score = 0;

  // Update board ends
  if (position.side === 'left') {
    if (domino.left === gameState.left_end) {
      gameState.left_end = domino.right;
    } else {
      gameState.left_end = domino.left;
    }
  } else {
    if (domino.right === gameState.right_end) {
      gameState.right_end = domino.left;
    } else {
      gameState.right_end = domino.right;
    }
  }

  // All Fives scoring
  if (gameState.mode === 'allfives') {
    const total = gameState.left_end + gameState.right_end;
    if (total % 5 === 0) {
      score = total;
    }
  }

  return score;
}

// Get next player in rotation
function getNextPlayer(gameState: GameState): string {
  const currentIndex = gameState.players.indexOf(gameState.current_player);
  const nextIndex = (currentIndex + 1) % gameState.players.length;
  return gameState.players[nextIndex];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const { gameId, userId, domino, position }: MoveRequest = await req.json();

    // Validate input
    if (!gameId || !userId || !domino || !position) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get game state from database
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: 'Game not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate the move
    const validation = isValidMove(game, domino, position, userId);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: validation.reason,
          error: validation.reason
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate score
    const score = calculateScore(game, domino, position);

    // Remove domino from player's hand
    const playerHand = game.player_hands[userId];
    const dominoIndex = playerHand.findIndex((d: any) =>
      (d.left === domino.left && d.right === domino.right) ||
      (d.left === domino.right && d.right === domino.left)
    );
    playerHand.splice(dominoIndex, 1);

    // Update board
    const newBoard = [...game.board];
    if (position.side === 'left') {
      newBoard.unshift({ ...domino, position });
    } else {
      newBoard.push({ ...domino, position });
    }

    // Update scores
    const newScores = { ...game.scores };
    newScores[userId] = (newScores[userId] || 0) + score;

    // Check for win condition
    const hasWon = playerHand.length === 0;
    const gameStatus = hasWon ? 'finished' : 'active';
    const winner = hasWon ? userId : null;

    // Get next player
    const nextPlayer = hasWon ? null : getNextPlayer(game);

    // Update game in database
    const { error: updateError } = await supabase
      .from('games')
      .update({
        board: newBoard,
        player_hands: game.player_hands,
        scores: newScores,
        current_player: nextPlayer,
        left_end: game.left_end,
        right_end: game.right_end,
        status: gameStatus,
        winner: winner,
        last_move: {
          player: userId,
          domino,
          position,
          timestamp: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Failed to update game:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update game state' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log move for audit trail
    await supabase
      .from('game_moves')
      .insert({
        game_id: gameId,
        player_id: userId,
        domino,
        position,
        score,
        timestamp: new Date().toISOString()
      });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        valid: true,
        score,
        nextPlayer,
        gameStatus,
        winner,
        boardState: {
          leftEnd: game.left_end,
          rightEnd: game.right_end,
          board: newBoard
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error validating move:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});