import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Termos = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container py-4">
          <Link 
            to="/#cadastro" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao cadastro
          </Link>
        </div>
      </header>

      <main className="container py-12 md:py-20">
        <div className="max-w-3xl mx-auto space-y-16">
          
          {/* Política de Privacidade */}
          <section id="politica-de-privacidade">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
              Política de Privacidade
            </h1>

            <div className="space-y-8 text-foreground/80">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Controladora dos dados pessoais</h2>
                <p>
                  A ENOVE IMOBILIÁRIA LTDA, pessoa jurídica de direito privado, doravante denominada ENOVE, 
                  é a controladora dos dados pessoais coletados por meio deste formulário, nos termos da 
                  Lei nº 13.709/2018 – Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados pessoais coletados</h2>
                <p className="mb-2">Por meio deste formulário, poderão ser coletados os seguintes dados pessoais:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Nome</li>
                  <li>Telefone (incluindo WhatsApp)</li>
                </ul>
                <p className="mt-2">Os dados são fornecidos voluntariamente pelo titular.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Finalidade do tratamento dos dados</h2>
                <p className="mb-2">Os dados pessoais coletados serão utilizados para as seguintes finalidades:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Entrar em contato com o titular para envio de informações sobre o Novo Condomínio de Estância Velha;</li>
                  <li>Apresentar oportunidades imobiliárias;</li>
                  <li>Enviar comunicações comerciais, informativas e promocionais sobre este e/ou outros empreendimentos imobiliários;</li>
                  <li>Realizar atendimento comercial e esclarecimento de dúvidas.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Base legal para o tratamento</h2>
                <p className="mb-2">O tratamento dos dados pessoais ocorre com fundamento:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>No consentimento expresso do titular, manifestado por meio do aceite desta Política de Privacidade; e</li>
                  <li>No legítimo interesse comercial da ENOVE, sempre respeitando os direitos, liberdades e expectativas do titular.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Autorização para contato</h2>
                <p className="mb-2">Ao marcar o checkbox de autorização e enviar o formulário, o titular autoriza expressamente que:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>A Enove Imobiliária Ltda; e</li>
                  <li>Seus corretores associados, parceiros comerciais e profissionais vinculados, sejam eles pessoas físicas ou jurídicas, 
                      entrem em contato por telefone, WhatsApp e outros meios de comunicação, para fins informativos e comerciais 
                      relacionados a empreendimentos imobiliários.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Compartilhamento de dados</h2>
                <p className="mb-2">Os dados pessoais poderão ser compartilhados:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Com corretores associados à ENOVE, para fins de atendimento e intermediação imobiliária;</li>
                  <li>Com a Incorporadora responsável pelo empreendimento, de forma genérica, quando necessário para repasse de informações técnicas e comerciais;</li>
                  <li>Com prestadores de serviços de tecnologia, marketing e CRM, estritamente para viabilizar a campanha.</li>
                </ul>
                <p className="mt-2">A ENOVE não comercializa dados pessoais.</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Armazenamento e segurança</h2>
                <p>
                  A ENOVE adota medidas técnicas e administrativas adequadas para proteger os dados pessoais contra 
                  acessos não autorizados, uso indevido, perda, alteração ou divulgação.
                </p>
                <p className="mt-2">
                  Os dados serão armazenados pelo período necessário para o cumprimento das finalidades aqui descritas 
                  ou conforme exigido por obrigações legais.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Direitos do titular</h2>
                <p className="mb-2">O titular poderá, a qualquer momento, solicitar:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Acesso aos seus dados;</li>
                  <li>Correção ou atualização;</li>
                  <li>Exclusão dos dados, quando aplicável;</li>
                  <li>Revogação do consentimento.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Atualizações</h2>
                <p>
                  Esta Política de Privacidade poderá ser alterada a qualquer tempo, sendo recomendada sua leitura periódica.
                </p>
              </div>
            </div>
          </section>

          {/* Divisor */}
          <hr className="border-border" />

          {/* Termos de Uso */}
          <section id="termos-de-uso">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Termos de Uso
            </h1>
            <p className="text-muted-foreground mb-8">
              Formulário de Divulgação – Novo Condomínio de Estância Velha
            </p>

            <div className="space-y-8 text-foreground/80">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Finalidade do formulário</h2>
                <p className="mb-2">Este formulário tem como finalidade exclusiva o cadastro de interessados para:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Receber informações preliminares e comerciais sobre o Novo Condomínio de Estância Velha;</li>
                  <li>Ser contatado pela Enove Imobiliária Ltda e seus corretores associados.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Origem das informações</h2>
                <p className="mb-2">O usuário declara ciência de que:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>As informações divulgadas sobre o empreendimento serão, futuramente fornecidas pela incorporadora responsável, de forma genérica;</li>
                  <li>A ENOVE atua como intermediadora imobiliária, não sendo responsável por decisões técnicas, alterações de projeto, preços, prazos ou condições definidas pela incorporadora.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Ausência de garantia de reserva ou compra</h2>
                <p className="mb-2">O cadastro neste formulário:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Não garante reserva de unidade ou lote;</li>
                  <li>Não assegura prioridade de compra;</li>
                  <li>Não configura proposta, pré-contrato ou compromisso de compra e venda.</li>
                </ul>
                <p className="mt-3 mb-2">Qualquer negociação futura dependerá de:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Lançamento oficial do empreendimento;</li>
                  <li>Disponibilidade das unidades;</li>
                  <li>Assinatura dos instrumentos contratuais próprios.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Caráter ilustrativo do material apresentado</h2>
                <p className="mb-2">O usuário reconhece que:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Imagens, plantas, perspectivas, renders, vídeos e materiais apresentados são meramente ilustrativos;</li>
                  <li>O empreendimento poderá sofrer alterações de layout, áreas, medidas, especificações técnicas e paisagismo;</li>
                  <li>As características finais serão aquelas constantes nos documentos oficiais da incorporadora.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Responsabilidade do usuário</h2>
                <p className="mb-2">O usuário declara que:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>As informações fornecidas são verdadeiras;</li>
                  <li>Possui capacidade legal para fornecer seus dados;</li>
                  <li>Leu e concorda integralmente com estes Termos de Uso e com a Política de Privacidade.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Limitação de responsabilidade</h2>
                <p className="mb-2">A ENOVE não se responsabiliza por:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Expectativas criadas a partir de material ilustrativo;</li>
                  <li>Decisões tomadas pelo usuário antes da divulgação oficial do empreendimento;</li>
                  <li>Alterações promovidas pela incorporadora após o cadastro.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Foro</h2>
                <p>
                  Fica eleito o foro da comarca de Estância Velha/RS, com renúncia a qualquer outro, 
                  por mais privilegiado que seja, para dirimir eventuais controvérsias.
                </p>
              </div>
            </div>
          </section>

          {/* CTA para voltar */}
          <div className="text-center pt-8">
            <Link 
              to="/#cadastro" 
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao cadastro
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Termos;
