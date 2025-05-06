import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

const ModalDialog = ({ showModal, modalContent, closeModal }) => {
  if (!showModal) return null;
  
  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{modalContent.title}</h3>
          <button className="close-modal" onClick={closeModal}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="modal-body">
          {modalContent.content.includes('<') ? 
            <div dangerouslySetInnerHTML={{ __html: modalContent.content }} /> :
            modalContent.content.split('\n').map((line, index) => (
              line.trim() ? 
                <p key={index} style={{marginBottom: line.startsWith('-') ? '4px' : '12px'}}>
                  {line}
                </p> 
                : <br key={index} />
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default ModalDialog;