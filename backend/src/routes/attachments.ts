import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import pool from '../database/connection';
import { getIO } from '../lib/socket';
import fs from 'fs';
import util from 'util';
import { pipeline } from 'stream';
import path from 'path';

const pump = util.promisify(pipeline);

const attachmentsRoutes: FastifyPluginAsync = async (app) => {
  
  // 1. UPLOAD DE ARQUIVO (Agora lendo cardId da URL)
  app.post('/', { onRequest: [app.authenticate] }, async (req, reply) => {
    
    // Validação do Card ID via URL (ex: /attachments?cardId=123...)
    const querySchema = z.object({
        cardId: z.string().uuid()
    });

    const queryParse = querySchema.safeParse(req.query);
    
    if (!queryParse.success) {
        return reply.status(400).send({ error: 'Card ID inválido ou não fornecido na URL' });
    }

    const { cardId } = queryParse.data;

    // Processa o arquivo
    const data = await req.file();
    if (!data) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
    }

    // 2. Gerar nome único
    const fileExtension = path.extname(data.filename);
    const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
    
    // Caminho da pasta uploads
    const uploadDir = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savePath = path.join(uploadDir, uniqueFileName);

    // 3. Salvar no disco
    await pump(data.file, fs.createWriteStream(savePath));

    // 4. Salvar no Banco
    const res = await pool.query(
        `INSERT INTO attachments (card_id, file_name, file_path, file_type) VALUES ($1, $2, $3, $4) RETURNING *`,
        [cardId, data.filename, uniqueFileName, data.mimetype]
    );
    const newAttachment = res.rows[0];

    // 5. Socket
    const boardRes = await pool.query(
        `SELECT c.column_id, col.board_id 
         FROM cards c 
         JOIN columns col ON c.column_id = col.id 
         WHERE c.id = $1`, 
        [cardId]
    );
    
    if (boardRes.rowCount && boardRes.rowCount > 0) {
        const boardId = boardRes.rows[0].board_id;
        
        const socketPayload = {
            id: newAttachment.id,
            fileName: newAttachment.file_name,
            filePath: newAttachment.file_path,
            fileType: newAttachment.file_type,
            createdAt: newAttachment.created_at
        };

        getIO().to(boardId).emit('attachment_added', { cardId, attachment: socketPayload });
    }

    return reply.status(201).send({
        id: newAttachment.id,
        fileName: newAttachment.file_name,
        filePath: newAttachment.file_path,
        fileType: newAttachment.file_type,
        createdAt: newAttachment.created_at
    });
  });

  // 2. DELETAR ANEXO (Mantido igual)
  app.delete('/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    const fileRes = await pool.query('SELECT * FROM attachments WHERE id=$1', [id]);
    if (fileRes.rowCount === 0) return reply.send({ success: true });
    
    const attachment = fileRes.rows[0];

    await pool.query('DELETE FROM attachments WHERE id=$1', [id]);

    try {
        const filePath = path.join(__dirname, '../../uploads', attachment.file_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) { console.error(err); }

    const boardRes = await pool.query(`SELECT c.column_id, col.board_id FROM cards c JOIN columns col ON c.column_id = col.id WHERE c.id = $1`, [attachment.card_id]);

    if (boardRes.rowCount && boardRes.rowCount > 0) {
        const boardId = boardRes.rows[0].board_id;
        getIO().to(boardId).emit('attachment_removed', { cardId: attachment.card_id, attachmentId: id });
    }

    return reply.send({ success: true });
  });
};

export default attachmentsRoutes;