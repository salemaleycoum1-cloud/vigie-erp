export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { etablissementIdDepuisPersonnel, peutEcrireEtablissement } from '../../../../lib/acces';

// DELETE /api/personnel/[id] — supprime un membre du personnel (et ses formations, via cascade)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id, 10);
  const etablissementId = await etablissementIdDepuisPersonnel(idNum);
  if (etablissementId === null || !(await peutEcrireEtablissement(etablissementId))) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  try {
    await sql.query('DELETE FROM personnel WHERE id = $1', [idNum]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
