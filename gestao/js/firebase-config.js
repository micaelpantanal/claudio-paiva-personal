/* Configuração do Firebase da gestão (app Web "Gestao" do projeto claudiopaiva).

   Esses valores não são senha: ficam visíveis para qualquer navegador e está tudo bem.
   Quem protege os dados são as regras do firestore.rules, que só deixam entrar as contas autorizadas.
   (Os e-mails autorizados ficam só nas regras, para não aparecerem no site nem no GitHub.)

   Se `apiKey` estiver vazio, o sistema abre em MODO DEMONSTRAÇÃO (dados de exemplo, só no navegador).
   Para ver a demonstração com o Firebase ligado, abra /gestao/?demo */

export const firebaseConfig = {
  apiKey: "AIzaSyBPxhcOlIgldj_0L06frvhiQBsFTmh86oM",
  authDomain: "claudiopaiva.firebaseapp.com",
  projectId: "claudiopaiva",
  storageBucket: "claudiopaiva.firebasestorage.app",
  messagingSenderId: "919885291007",
  appId: "1:919885291007:web:d20363f1dcb0c73c1e5bca",
};
